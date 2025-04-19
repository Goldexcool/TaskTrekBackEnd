const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const boardController = require('../controllers/boardController');

// Add this BEFORE other routes to avoid path conflicts
router.get('/complete', authMiddleware.authenticateToken, boardController.getAllBoardsComplete);

// Existing routes
router.route('/')
  .post(authMiddleware.authenticateToken, boardController.createBoard)
  .get(authMiddleware.authenticateToken, boardController.getBoards);

router.get('/team/:teamId', authMiddleware.authenticateToken, boardController.getBoardsByTeam); 
router.get('/:id', authMiddleware.authenticateToken, boardController.getBoardById);
router.put('/:id', authMiddleware.authenticateToken, boardController.updateBoard);
router.delete('/:id', authMiddleware.authenticateToken, boardController.deleteBoard);

module.exports = router;