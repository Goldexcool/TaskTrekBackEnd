const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  sendPasswordResetEmail, 
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail 
} = require('../utils/mailer');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshTokenHandler); // <-- Fixed this line
router.post('/logout', authenticateToken, authController.logout);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;