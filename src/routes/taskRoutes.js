const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// Debug what's being imported
console.log('Task controller functions:', Object.keys(taskController));

// Get all tasks (for a user)
router.get('/all', authMiddleware.authenticateToken, (req, res) => {
  taskController.getAllTasks(req, res);
});

// Get task by ID - Make sure this comes AFTER the /all route
router.get('/:id', authMiddleware.authenticateToken, (req, res) => {
  taskController.getTaskById(req, res);
});

// Define routes with direct access to controller functions
const updateTaskHandler = taskController.updateTask;
const moveTaskHandler = taskController.moveTask;
const deleteTaskHandler = taskController.deleteTask;

// Use the handler variables to avoid potential undefined issues
router.patch('/:id', authMiddleware.authenticateToken, updateTaskHandler);
router.patch('/:id/move', authMiddleware.authenticateToken, moveTaskHandler);
router.delete('/:id', authMiddleware.authenticateToken, deleteTaskHandler);

module.exports = router;