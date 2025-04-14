const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  refreshTokenHandler, 
  logout, 
  getMe, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);  // Single login route for all users
router.post('/refresh-token', refreshTokenHandler);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticateToken, getMe);

module.exports = router;