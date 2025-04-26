const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const boardController = require('../controllers/boardController');
const taskController = require('../controllers/taskController');

// Get all boards
router.get('/', authMiddleware.authenticateToken, boardController.getBoards);

// Create a new board
router.post('/', authMiddleware.authenticateToken, boardController.createBoard);

// Special routes should come BEFORE the /:id route
router.get('/complete', authMiddleware.authenticateToken, boardController.getAllBoardsComplete);

// Get a single board by ID
router.get('/:id', authMiddleware.authenticateToken, boardController.getBoardById);

// Update a board (PATCH for partial updates)
router.patch('/:id', authMiddleware.authenticateToken, boardController.updateBoard);

// Delete a board
router.delete('/:id', authMiddleware.authenticateToken, boardController.deleteBoard);

// Add a member to a board
router.post('/:id/members', authMiddleware.authenticateToken, boardController.addMember);

// Remove a member from a board
router.delete('/:id/members/:userId', authMiddleware.authenticateToken, boardController.removeMember);

// Update member role
router.patch('/:id/members/:userId/role', authMiddleware.authenticateToken, boardController.updateMemberRole);

// Create column in board
router.post('/:id/columns', authMiddleware.authenticateToken, boardController.createColumn);

// Update column
router.patch('/:boardId/columns/:columnId', authMiddleware.authenticateToken, boardController.updateColumn);

// Delete column
router.delete('/:boardId/columns/:columnId', authMiddleware.authenticateToken, boardController.deleteColumn);

// Create a task in a column
router.post('/:boardId/columns/:columnId/tasks', 
  authMiddleware.authenticateToken, 
  taskController.createTaskFromBody
);

// Share a board
router.post('/:id/share', authMiddleware.authenticateToken, boardController.shareBoard);

module.exports = router;