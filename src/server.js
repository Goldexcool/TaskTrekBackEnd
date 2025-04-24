const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

// Load environment variables
dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS settings
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Make io instance available to our routes
app.set('io', io);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join user to their personal room for targeted messages
  socket.on('join:user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    }
  });
  
  // Join user to a board room for board-specific updates
  socket.on('join:board', (boardId) => {
    if (boardId) {
      socket.join(`board:${boardId}`);
      console.log(`User joined board room: ${boardId}`);
    }
  });
  
  // Join user to team room for team-wide notifications
  socket.on('join:team', (teamId) => {
    if (teamId) {
      socket.join(`team:${teamId}`);
      console.log(`User joined team room: ${teamId}`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const maxRetries = 4;
    let retries = 0;
    let connected = false;
    
    while (retries < maxRetries && !connected) {
      try {
        retries++;
        console.log(`MongoDB connection attempt ${retries}/${maxRetries}...`);
        
        // Extract username from connection string for logging (hide password)
        const uri = process.env.MONGODB_URI;
        const usernameMatch = uri.match(/\/\/(.*?):/);
        const username = usernameMatch ? usernameMatch[1] : 'unknown';
        console.log(`Connecting with username: ${username}`);
        
        await mongoose.connect(process.env.MONGODB_URI);
        connected = true;
        
        console.log(`MongoDB connected successfully: ${mongoose.connection.host}`);
        console.log(`Database name: ${mongoose.connection.db.databaseName}`);
      } catch (error) {
        console.error(`Connection attempt ${retries} failed:`, error.message);
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Check for required environment variables
    const requiredEnvVars = [
      'MONGODB_URI', 
      'JWT_SECRET', 
      'ACCESS_TOKEN_SECRET', 
      'REFRESH_TOKEN_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      process.exit(1);
    }
    
    console.log('✅ All required environment variables are set');
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();