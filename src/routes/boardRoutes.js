const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Existing routes
router.post('/', authenticateToken, boardController.createBoard);
router.get('/', authenticateToken, boardController.getBoards);
router.get('/team/:teamId', authenticateToken, boardController.getBoardsByTeam); 
router.get('/:id', authenticateToken, boardController.getBoardById);
router.put('/:id', authenticateToken, boardController.updateBoard);
router.delete('/:id', authenticateToken, boardController.deleteBoard);

module.exports = router;