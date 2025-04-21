const mongoose = require('mongoose');
const { URL } = require('url');

// Connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  family: 4,
};

// MongoDB versions check
if (mongoose.version.startsWith('5.')) {
  connectionOptions.useCreateIndex = true;
}

// Retry configuration
const MAX_RETRIES = 3;
let retryCount = 0;

/**
 * Normalize MongoDB connection string to avoid deprecation warnings
 */
const normalizeMongoDbUri = (uri) => {
  if (!uri) return uri;
  
  try {
    // Check if it's already in the preferred format
    if (uri.startsWith('mongodb+srv://') && uri.includes('/?')) {
      const parts = uri.split('/?');
      if (parts.length === 2) {
        // Extract host and add database name if missing
        const hostPart = parts[0];
        const queryPart = parts[1];
        
        // Check if there's a database name after the hostname
        if (!hostPart.split('/')[3]) {
          // No database name, add 'tasktrek'
          return `${hostPart}/tasktrek?${queryPart}`;
        }
      }
    }
    
    // Already in good format or can't be safely normalized
    return uri;
  } catch (e) {
    console.warn('Error normalizing MongoDB URI:', e.message);
    return uri; // Return original URI if there was an error
  }
};

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  try {
    console.log(`MongoDB connection attempt ${retryCount + 1}/${MAX_RETRIES + 1}...`);
    
    // Validate connection string before attempting connection
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // Normalize the URI to avoid deprecation warnings
    const normalizedUri = normalizeMongoDbUri(process.env.MONGODB_URI);
    
    // Extract username from URI for logging (without showing full credentials)
    try {
      const uriParts = normalizedUri.split('@');
      const credentialPart = uriParts[0].split('//')[1];
      const username = credentialPart.split(':')[0];
      console.log(`Connecting with username: ${username}`);
    } catch (e) {
      console.log('Could not parse username from URI');
    }
    
    // Try connection with explicit database name
    const conn = await mongoose.connect(normalizedUri, connectionOptions);
    
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name || 'unknown'}`);
    
    // Reset retry count on successful connection
    retryCount = 0;
    
    // Setup connection monitoring
    setupConnectionMonitoring();
    
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error(error);
    
    // Handle specific error types
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.error('Authentication failed. Please check your MongoDB username and password.');
      console.log('\n===== MONGODB AUTHENTICATION TROUBLESHOOTING =====');
      console.log('1. Verify your username and password in the .env file');
      console.log('2. Ensure the user exists in MongoDB Atlas');
      console.log('3. Make sure the user has appropriate permissions');
      console.log('4. Check if your IP address is whitelisted in MongoDB Atlas');
      console.log('5. Try regenerating the password in MongoDB Atlas');
      console.log('=================================================\n');
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network issue with MongoDB connection. Check your internet connection.');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('Could not select a MongoDB server. The server might be down or the connection string might be incorrect.');
    }
    
    // Retry logic for certain errors
    const retriableErrors = ['MongoNetworkError', 'MongoServerSelectionError', 'MongoTimeoutError'];
    const isRetriable = retriableErrors.includes(error.name) || 
                         error.message.includes('getaddrinfo');
    
    if (isRetriable && retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = 2000 * retryCount; // Progressive delay: 2s, 4s, 6s
      
      console.log(`Will retry connection in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
      
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await connectDB();
          resolve(result);
        }, delay);
      });
    }
    
    // If we've reached max retries or it's not a retriable error
    if (process.env.NODE_ENV === 'production') {
      console.error('Failed to connect to MongoDB. Exiting in production mode.');
      return false;
    }
    
    console.warn('Failed to connect to MongoDB, but continuing in development mode with limited functionality.');
    return false;
  }
};

/**
 * Setup connection monitoring
 */
function setupConnectionMonitoring() {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });
}

/**
 * Check if MongoDB is connected
 */
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Export functions
module.exports = { connectDB, isMongoConnected };