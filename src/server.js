const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

// Load environment variables
dotenv.config();

// Connect to database
const startServer = async () => {
  try {
    await connectDB();
    
    // Define port with fallbacks
    const PORT = process.env.PORT || 3000;
    
    // Try to start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`CORS configured to allow origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001'}`);
    });
    
    // Handle unhandled errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
        setTimeout(() => {
          server.close();
          server.listen(PORT + 1);
        }, 1000);
      } else {
        console.error('Server error:', error);
      }
    });
    
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();