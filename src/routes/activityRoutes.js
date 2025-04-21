const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Base activity feed (personal + teams)
router.get('/', activityController.getActivityFeed);

// Team-specific activity feed
router.get('/team/:teamId', activityController.getTeamActivityFeed);

// Board-specific activity feed
router.get('/board/:boardId', activityController.getBoardActivityFeed);

// Task-specific activity feed
router.get('/task/:taskId', activityController.getTaskActivityFeed);

// Personal tasks activity feed
router.get('/personal-tasks', activityController.getPersonalTaskActivityFeed);

// User-specific activity feed (admin only)
// Use this version if isAdmin middleware isn't properly defined
router.get('/user/:userId', (req, res, next) => {
  // Simple admin check
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }
  next();
}, activityController.getUserActivityFeedById);

module.exports = router;