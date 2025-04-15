const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config();

// Try different ports if the default one is in use
const attemptToStartServer = async (port) => {
  try {
    // Start the server with the given port
    const server = app.listen(port, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    });
    
    // Set up error handling
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, trying ${port + 1}...`);
        // Try the next port
        server.close();
        attemptToStartServer(port + 1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    const isConnected = await connectDB();
    
    if (!isConnected) {
      console.error('Failed to connect to MongoDB. Server will not start.');
      process.exit(1);
    }
    
    // Try to start the server with the initial port
    const initialPort = process.env.PORT || 3000;
    attemptToStartServer(initialPort);
  } catch (error) {
    console.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server and exit process
  process.exit(1);
});

startServer();