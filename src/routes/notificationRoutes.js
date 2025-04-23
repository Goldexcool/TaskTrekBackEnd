const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Get all notifications for current user
router.get('/', authMiddleware.authenticateToken, notificationController.getNotifications);

// Mark notifications as read
router.patch('/read', authMiddleware.authenticateToken, notificationController.markAsRead);

// Delete a notification
router.delete('/:id', authMiddleware.authenticateToken, notificationController.deleteNotification);

module.exports = router;