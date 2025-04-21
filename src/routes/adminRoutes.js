const express = require('express');
const router = express.Router();
const testMongoDBDNS = require('../utils/dnsTest');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware
router.use(authenticateToken);

// Add admin check middleware
const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }
  next();
};

// DNS test endpoint
router.get('/test-mongodb-dns', checkAdmin, async (req, res) => {
  try {
    const results = await testMongoDBDNS();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error testing MongoDB DNS'
    });
  }
});

module.exports = router;