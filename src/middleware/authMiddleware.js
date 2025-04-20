const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in environment variables!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    // Use JWT_SECRET for verification
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      // Set user data in request object
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = { authenticateToken };