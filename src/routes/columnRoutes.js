const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Column routes
router.post('/', authenticateToken, columnController.createColumn);
router.get('/board/:boardId', authenticateToken, columnController.getColumnsByBoard);
router.put('/:id', authenticateToken, columnController.updateColumn);
router.delete('/:id', authenticateToken, columnController.deleteColumn);

module.exports = router;