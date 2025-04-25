const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/all', authMiddleware.authenticateToken, taskController.getAllTasks);

router.get('/column/:columnId', authMiddleware.authenticateToken, taskController.getTasksByColumn);

router.post('/', authMiddleware.authenticateToken, taskController.createTaskFromBody);

router.get('/:id', authMiddleware.authenticateToken, taskController.getTaskById);

router.patch('/:id', authMiddleware.authenticateToken, taskController.updateTask);

router.patch('/:id/move', authMiddleware.authenticateToken, taskController.moveTask);

router.patch('/:id/complete', authMiddleware.authenticateToken, taskController.completeTask);

router.patch('/:id/reopen', authMiddleware.authenticateToken, taskController.reopenTask);

router.delete('/:id', authMiddleware.authenticateToken, taskController.deleteTask);

module.exports = router;