const mongoose = require('mongoose');

// Connection function
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, 
      socketTimeoutMS: 45000,          
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4,
      useCreateIndex: true  
    });
    
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Better error handling
    if (error.name === 'MongoNetworkError') {
      console.error('Network issue with MongoDB connection. Check your internet connection.');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('Could not select a MongoDB server. The server might be down or the connection string might be incorrect.');
    }
    return false;
  }
};

// Check if MongoDB is connected
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Export both functions
module.exports = { connectDB, isMongoConnected };