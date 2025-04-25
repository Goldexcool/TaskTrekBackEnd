const express = require('express');
const router = express.Router();
const testMongoDBDNS = require('../utils/dnsTest');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }
  next();
};

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