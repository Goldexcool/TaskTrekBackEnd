const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

// Activities routes
router.get('/feed', authMiddleware.authenticateToken, activityController.getActivityFeed);
router.get('/user', authMiddleware.authenticateToken, activityController.getUserActivities);
router.get('/team/:teamId', authMiddleware.authenticateToken, activityController.getTeamActivities);
router.get('/board/:boardId', authMiddleware.authenticateToken, activityController.getBoardActivities);
router.get('/task/:taskId', authMiddleware.authenticateToken, activityController.getTaskActivities);

module.exports = router;