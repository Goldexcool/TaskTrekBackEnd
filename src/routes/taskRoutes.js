const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware'); // Import the whole module

// Add this BEFORE other routes to avoid path conflicts
router.get('/all', authMiddleware.authenticateToken, taskController.getAllTasks);

// Task routes
router.post('/', authMiddleware.authenticateToken, taskController.createTask);
router.get('/column/:columnId', authMiddleware.authenticateToken, taskController.getTasksByColumn);
router.get('/:id', authMiddleware.authenticateToken, taskController.getTaskById);
router.put('/:id', authMiddleware.authenticateToken, taskController.updateTask);
router.delete('/:id', authMiddleware.authenticateToken, taskController.deleteTask);
router.put('/:id/move', authMiddleware.authenticateToken, taskController.moveTask);
router.put('/:id/reopen', authMiddleware.authenticateToken, taskController.reopenTask); // Changed this line

// Add these endpoints for assignment and completion
router.patch('/:id/assign', authMiddleware.authenticateToken, taskController.assignTask);
router.patch('/:id/unassign', authMiddleware.authenticateToken, taskController.unassignTask);
router.patch('/:id/complete', authMiddleware.authenticateToken, taskController.completeTask);

module.exports = router;