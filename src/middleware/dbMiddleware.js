const { isMongoConnected } = require('../config/db');

/**
 * Middleware to check database connection before processing requests
 */
const checkDatabaseConnection = (req, res, next) => {
  if (!isMongoConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable',
      retryAfter: 30, // Suggest retry after 30 seconds
      code: 'DB_CONNECTION_ERROR'
    });
  }
  next();
};

module.exports = { checkDatabaseConnection };