const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.authenticateToken, activityController.getUserActivityFeed);

router.get('/feed', authMiddleware.authenticateToken, activityController.getUserActivityFeed);

module.exports = router;