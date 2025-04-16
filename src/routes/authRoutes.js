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

// Add this to your authRoutes.js to test email functionality
router.get('/test-email', async (req, res) => {
  try {
    const testUser = {
      username: 'testuser',
      email: 'test@example.com'
    };
    
    await sendWelcomeEmail(testUser);
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/me', authController.authenticateToken, authController.getMe);

module.exports = router;