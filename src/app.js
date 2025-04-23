const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// Don't import connectDB here as it's handled in server.js

// Load environment variables
dotenv.config();

// Set default JWT secrets if they're not in environment variables
// CRITICAL: These are fallbacks for development only!
if (!process.env.ACCESS_TOKEN_SECRET) {
  console.warn('⚠️ JWT_SECRET not found in environment, using development fallback (NOT SECURE FOR PRODUCTION)');
  process.env.ACCESS_TOKEN_SECRET = 'dev-jwt-secret-key-tasktrek-backend-2025-development-only';
}

if (!process.env.REFRESH_TOKEN_SECRET) {
  console.warn('⚠️ REFRESH_TOKEN_SECRET not found in environment, using development fallback (NOT SECURE FOR PRODUCTION)');
  process.env.REFRESH_TOKEN_SECRET = 'dev-refresh-token-secret-key-tasktrek-backend-2025-development-only';
}

// Get allowed origins from environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || 
        /\.tasktrek\.com$/.test(origin) || 
        process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

// Import routes after environment setup to ensure they have access to env vars
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 
const boardRoutes = require('./routes/boardRoutes');
const columnRoutes = require('./routes/columnRoutes');
const taskRoutes = require('./routes/taskRoutes');
const teamRoutes = require('./routes/teamRoutes');
const activityRoutes = require('./routes/activityRoutes'); 
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);  
app.use('/api/users', userRoutes); 
app.use('/api/teams', teamRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;