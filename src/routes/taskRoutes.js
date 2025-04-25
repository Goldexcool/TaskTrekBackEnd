const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('Task controller functions:', Object.keys(taskController));

router.get('/all', authMiddleware.authenticateToken, (req, res) => {
  taskController.getAllTasks(req, res);
});

router.get('/:id', authMiddleware.authenticateToken, (req, res) => {
  taskController.getTaskById(req, res);
});

router.post('/', authMiddleware.authenticateToken, taskController.createTaskFromBody);

const updateTaskHandler = taskController.updateTask;
const moveTaskHandler = taskController.moveTask;
const deleteTaskHandler = taskController.deleteTask;

router.patch('/:id', authMiddleware.authenticateToken, updateTaskHandler);
router.patch('/:id/move', authMiddleware.authenticateToken, moveTaskHandler);
router.delete('/:id', authMiddleware.authenticateToken, deleteTaskHandler);

module.exports = router;