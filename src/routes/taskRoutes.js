const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/all', authMiddleware.authenticateToken, taskController.getAllTasks);

router.post('/', authMiddleware.authenticateToken, taskController.createTaskFromBody);

router.get('/:id', authMiddleware.authenticateToken, taskController.getTaskById);

router.patch('/:id', authMiddleware.authenticateToken, taskController.updateTask);
router.patch('/:id/move', authMiddleware.authenticateToken, taskController.moveTask);
router.delete('/:id', authMiddleware.authenticateToken, taskController.deleteTask);

module.exports = router;