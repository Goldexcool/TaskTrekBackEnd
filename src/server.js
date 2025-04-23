const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./config/db');
const app = require('./app');

// Load environment variables
dotenv.config();

// Check and set critical environment variables
const ensureEnvVars = () => {
  const requiredVars = {
    JWT_SECRET: 'dev-jwt-secret-key-tasktrek-backend-2025-development-only',
    REFRESH_TOKEN_SECRET: 'dev-refresh-token-secret-key-tasktrek-backend-2025-development-only',
    MONGODB_URI: process.env.MONGODB_URI 
  };
  
  let missingVars = [];
  let warnMessage = '';
  
  for (const [key, defaultValue] of Object.entries(requiredVars)) {
    if (!process.env[key]) {
      missingVars.push(key);
      
      if (defaultValue && key !== 'MONGODB_URI') {
        process.env[key] = defaultValue;
        warnMessage += `\n  - ${key} set to development default (NOT SECURE FOR PRODUCTION)`;
      }
    }
  }
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables:${warnMessage}\n`);
    console.warn('Please create or update your .env file with these variables.');
    
    // Create a sample .env file if it doesn't exist
    try {
      const envPath = path.join(__dirname, '..', '.env');
      if (!fs.existsSync(envPath)) {
        const envContent = Object.entries(requiredVars)
          .map(([key, value]) => `${key}=${key === 'MONGODB_URI' ? 'your_mongodb_connection_string' : value}`)
          .join('\n');
        
        fs.writeFileSync(envPath, envContent);
        console.log('Created sample .env file. Please update it with your actual values.');
      }
    } catch (err) {
      console.error('Failed to create sample .env file:', err.message);
    }
  } else {
    console.log('✅ All required environment variables are set');
  }
};

ensureEnvVars();

// Set port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS settings
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handler
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Authenticate connection with JWT
  socket.on('authenticate', (token) => {
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store the authenticated user's ID with this socket
      socket.userId = decoded.id;
      
      // Add to connected users map
      if (!connectedUsers.has(decoded.id)) {
        connectedUsers.set(decoded.id, new Set());
      }
      connectedUsers.get(decoded.id).add(socket.id);
      
      // Join a room specific to this user for direct messages
      socket.join(`user:${decoded.id}`);
      
      console.log(`User ${decoded.id} authenticated on socket ${socket.id}`);
      socket.emit('authenticated');
      
    } catch (error) {
      console.error('Socket authentication failed:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.userId) {
      // Remove socket from user's connections
      const userSockets = connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId);
        }
      }
    }
  });
});

// Make io available to the rest of the app
app.set('io', io);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to database
    const dbConnected = await connectDB();
    
    if (!dbConnected && process.env.NODE_ENV === 'production') {
      console.error('Failed to connect to MongoDB. Exiting in production mode.');
      process.exit(1);
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`CORS configured to allow origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001'}`);
    });
  } catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();