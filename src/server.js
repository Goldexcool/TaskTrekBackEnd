const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const isConnected = await connectDB();
    
    if (!isConnected) {
      console.error('Failed to connect to MongoDB. Server will not start.');
      process.exit(1);
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
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