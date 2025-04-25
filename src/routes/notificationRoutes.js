const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/', authMiddleware.authenticateToken, notificationController.getNotifications);

router.patch('/read', authMiddleware.authenticateToken, notificationController.markAsRead);

router.delete('/:id', authMiddleware.authenticateToken, notificationController.deleteNotification);

module.exports = router;