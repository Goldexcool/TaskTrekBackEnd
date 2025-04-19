const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');

// Create task
const createTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      columnId, 
      position, 
      dueDate,
      priority, // Add priority to destructuring
      labels, 
      assignedTo 
    } = req.body;
    
    // Validate required fields
    if (!title || !columnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide task title and column ID'
      });
    }
    
    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
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
      priority, // Include priority
      position: position || 0,
      dueDate: formattedDueDate,
      labels,
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
    
    // If priority is provided, validate it
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }
    
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

// @desc    Get all tasks for the authenticated user
// @route   GET /api/tasks/all
// @access  Private
const getAllTasks = async (req, res) => {
  try {
    const { 
      priority, 
      dueDate, 
      overdue, 
      completed, 
      assignedToMe, 
      boardId, 
      teamId 
    } = req.query;
    
    // Start with a base query
    let query = {};
    
    // Find boards the user is a member of
    let boardIds = [];
    
    if (boardId) {
      // If specific board is requested
      boardIds = [boardId];
    } else if (teamId) {
      // If specific team is requested
      const boards = await Board.find({ 
        team: teamId,
        members: req.user.id 
      }).select('_id');
      boardIds = boards.map(board => board._id);
    } else {
      // Get all boards user has access to
      const boards = await Board.find({ 
        members: req.user.id 
      }).select('_id');
      boardIds = boards.map(board => board._id);
    }
    
    // Add board condition to query
    query.board = { $in: boardIds };
    
    // Apply filters
    if (priority) {
      query.priority = priority; // 'low', 'medium', or 'high'
    }
    
    if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.dueDate = {
        $gte: today,
        $lt: tomorrow
      };
    } else if (dueDate === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      query.dueDate = {
        $gte: today,
        $lt: nextWeek
      };
    }
    
    if (overdue === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      query.dueDate = {
        $lt: today
      };
      query.completed = { $ne: true }; // Not completed
    }
    
    if (completed === 'true') {
      query.completed = true;
    } else if (completed === 'false') {
      query.completed = { $ne: true };
    }
    
    if (assignedToMe === 'true') {
      query.assignedTo = req.user.id;
    }
    
    // Perform the query with population
    const tasks = await Task.find(query)
      .populate({
        path: 'column',
        select: 'title'
      })
      .populate({
        path: 'board',
        select: 'title'
      })
      .populate({
        path: 'assignedTo',
        select: 'username email name avatar'
      })
      .populate({
        path: 'createdBy',
        select: 'username email name avatar'
      })
      .sort({ dueDate: 1, priority: -1 });
    
    // Format the tasks
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      completed: task.completed || false,
      board: {
        id: task.board._id,
        title: task.board.title
      },
      column: {
        id: task.column._id,
        title: task.column.title
      },
      assignedTo: task.assignedTo ? {
        id: task.assignedTo._id,
        username: task.assignedTo.username,
        name: task.assignedTo.name || task.assignedTo.username,
        avatar: task.assignedTo.avatar
      } : null,
      createdBy: {
        id: task.createdBy._id,
        username: task.createdBy.username,
        name: task.createdBy.name || task.createdBy.username,
        avatar: task.createdBy.avatar
      },
      labels: task.labels,
      position: task.position,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
    
    res.status(200).json({
      success: true,
      count: formattedTasks.length,
      data: formattedTasks
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving tasks'
    });
  }
};

module.exports = {
  createTask,
  getTasksByColumn,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  getAllTasks  // Add this line
};