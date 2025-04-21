const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Add this BEFORE other routes to avoid path conflicts
router.get('/all', authenticateToken, taskController.getAllTasks);

// Task routes
router.post('/', authenticateToken, taskController.createTask);
router.get('/column/:columnId', authenticateToken, taskController.getTasksByColumn);
router.get('/:id', authenticateToken, taskController.getTaskById);
router.put('/:id', authenticateToken, taskController.updateTask);
router.delete('/:id', authenticateToken, taskController.deleteTask);
router.put('/:id/move', authenticateToken, taskController.moveTask);
router.put('/:id/reopen', authMiddleware.authenticateToken, taskController.reopenTask);

// Add these endpoints for assignment and completion
router.patch('/:id/assign', authenticateToken, taskController.assignTask);
router.patch('/:id/unassign', authenticateToken, taskController.unassignTask);
router.patch('/:id/complete', authenticateToken, taskController.completeTask);

module.exports = router;