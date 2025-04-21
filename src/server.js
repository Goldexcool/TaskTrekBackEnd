const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
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
    app.listen(PORT, () => {
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