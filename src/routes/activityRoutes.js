const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's activity feed (includes personal and team activities)
router.get('/', activityController.getActivityFeed);

// Get activity feed for a specific team
router.get('/team/:teamId', activityController.getTeamActivityFeed);

module.exports = router;