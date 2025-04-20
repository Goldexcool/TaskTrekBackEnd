const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get authenticated user's profile
router.get('/profile', authenticateToken, userController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, userController.updateProfile);

// Get user by ID
router.get('/:id', authenticateToken, userController.getUserById);

module.exports = router;