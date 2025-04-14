const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');

// Create task
const createTask = async (req, res) => {
  try {
    const { title, description, columnId, priority, position, dueDate, assignedTo } = req.body;
    
    // Validate required fields
    if (!title || !columnId) {
      return res.status(400).json({
        success: false,
        message: "Please provide title and columnId"
      });
    }
    
    // Check if column exists
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found"
      });
    }
    
    // Safely format date
    let formattedDueDate = null;
    if (dueDate) {
      try {
        // Handle various date formats
        formattedDueDate = new Date(dueDate);
        // Check if date is valid
        if (isNaN(formattedDueDate.getTime())) {
          // Try to parse non-standard format like "21-05-2025"
          const parts = dueDate.split('-');
          if (parts.length === 3) {
            // Remove any trailing characters like apostrophes
            const year = parts[2].replace(/[^0-9]/g, '');
            formattedDueDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
          }
          
          // If still invalid, return error
          if (isNaN(formattedDueDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid date format. Please use YYYY-MM-DD format."
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format."
        });
      }
    }
    
    // Create task with properly formatted date
    const task = await Task.create({
      title,
      description,
      column: columnId,
      priority: priority || 'medium',
      position: position || 0,
      dueDate: formattedDueDate,
      assignedTo: assignedTo || req.user.id,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all tasks for a column
const getTasks = async (req, res) => {
  try {
    const { columnId } = req.query;
    
    if (!columnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a columnId'
      });
    }
    
    // Check if the column exists
    const column = await Column.findById(columnId);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }
    
    // Check if the board associated with the column belongs to the user
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    if (board.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tasks in this column'
      });
    }
    
    // Get tasks for the column
    const tasks = await Task.find({ column: columnId }).sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get tasks by column
const getTasksByColumn = async (req, res) => {
  try {
    const columnId = req.params.columnId;
    console.log('Getting tasks for column:', columnId);
    
    // Check if the column exists
    const column = await Column.findById(columnId);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }
    
    // Get tasks for the column
    const tasks = await Task.find({ column: columnId })
      .sort({ position: 1 });
    
    console.log(`Found ${tasks.length} tasks for column`);
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    console.log('Getting task by ID:', taskId);
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if current user is the creator of the board or a team member
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      console.log('User is not the board creator, checking team membership...');
      // For now, allow access - you can implement team membership checks later
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, position } = req.body;
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if current user is the creator of the board
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      // For now, allow access - you can implement team membership checks later
    }
    
    // Update task fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate) {
      // Safely handle date
      try {
        task.dueDate = new Date(dueDate);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }
    if (priority) task.priority = priority;
    if (position !== undefined) task.position = position;
    
    await task.save();
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Safe access to board creator
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      console.log('User is not the board creator, allowing delete for now');
    }
    
    await Task.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Move a task to a different column
const moveTask = async (req, res) => {
  try {
    // Accept both targetColumnId and columnId for flexibility
    const targetColumnId = req.body.targetColumnId || req.body.columnId;
    const position = req.body.position || req.body.order; // Accept both position and order
    
    console.log('Moving task', req.params.id, 'to column', targetColumnId, 'at position', position);
    console.log('Request body:', req.body);
    
    if (!targetColumnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide targetColumnId or columnId'
      });
    }
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the target column exists
    const targetColumn = await Column.findById(targetColumnId);
    
    if (!targetColumn) {
      return res.status(404).json({
        success: false,
        message: 'Target column not found'
      });
    }
    
    // Check if the user has access to the board
    const board = await Board.findById(targetColumn.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Safe access to board creator
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      // For now, allow access - you can implement team membership checks later
      console.log('User is not the board creator, allowing move for now');
    }
    
    // Update task
    task.column = targetColumnId;
    if (position !== undefined) task.position = position;
    
    await task.save();
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Debug function to check all tasks
const debugTasks = async (req, res) => {
  try {
    // Get all tasks
    const tasks = await Task.find({});
    
    // Get task count by column
    const tasksByColumn = [];
    const columns = await Column.find({});
    
    for (const column of columns) {
      const count = await Task.countDocuments({ column: column._id });
      tasksByColumn.push({
        columnId: column._id,
        columnTitle: column.title,
        taskCount: count
      });
    }
    
    res.status(200).json({
      success: true,
      tasksCount: tasks.length,
      tasksByColumn,
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        column: task.column,
        priority: task.priority,
        dueDate: task.dueDate
      }))
    });
  } catch (error) {
    console.error('Debug tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTasksByColumn,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  debugTasks
};