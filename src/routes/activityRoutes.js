const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Activity routes
router.get('/feed', authenticateToken, activityController.getActivityFeed);
router.get('/user', authenticateToken, activityController.getUserActivities);
router.get('/team/:teamId', authenticateToken, activityController.getTeamActivities);
router.get('/board/:boardId', authenticateToken, activityController.getBoardActivities);
router.get('/task/:taskId', authenticateToken, activityController.getTaskActivities);

module.exports = router;