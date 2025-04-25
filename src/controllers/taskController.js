const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Team = require('../models/Team'); 
const User = require('../models/User'); 
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * Check if a user has permission to access a board
 */
const checkBoardPermission = async (board, userId) => {
  if (board.createdBy && board.createdBy.toString() === userId) {
    return true;
  }
  
  if (board.members && Array.isArray(board.members)) {
    const isMember = board.members.some(member => 
      member.user && (
        typeof member.user === 'string' 
          ? member.user === userId
          : member.user.toString() === userId
      )
    );
    
    if (isMember) {
      return true;
    }
  }
  
  if (board.team) {
    const team = await Team.findById(board.team);
    if (team) {
      // Team owner has admin privileges
      if (team.owner && team.owner.toString() === userId) {
        return true;
      }
      
      if (team.admins && team.admins.some(adminId => adminId.toString() === userId)) {
        return true;
      }
      
      if (team.members && team.members.some(memberId => 
        typeof memberId === 'object' 
          ? memberId.user && memberId.user.toString() === userId
          : memberId.toString() === userId
      )) {
        return true;
      }
    }
  }
  
  // No permission
  return false;
};

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    const { title, description, priority = 'medium', dueDate, assignedTo } = req.body;

    // Validate input
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Check if board and column exist
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    const column = await Column.findOne({ _id: columnId, board: boardId });
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found in this board'
      });
    }

    // Check permission
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create tasks in this board'
      });
    }

    // Get max order in the column
    const maxOrderTask = await Task.findOne({ column: columnId })
      .sort({ order: -1 })
      .limit(1);
    
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user.id,
      board: boardId,
      column: columnId,
      order,
      team: board.team
    });

    // Populate created task
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email');

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'created_task',
      taskId: task._id,
      boardId,
      columnId,
      teamId: board.team,
      metadata: { 
        taskTitle: title,
        priority,
        assignedTo: assignedTo || null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a task (client-friendly version that accepts columnId in body)
 * @route POST /api/tasks
 * @access Private
 */
const createTaskFromBody = async (req, res) => {
  try {
    const { title, columnId, position, description, priority, dueDate, assignedTo } = req.body;
    
    if (!columnId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: columnId and title are required'
      });
    }
    
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }
    
    const boardId = column.board;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create tasks in this board'
      });
    }

    let order = position;
    if (order === undefined) {
      const maxOrderTask = await Task.findOne({ column: columnId })
        .sort({ order: -1 })
        .limit(1);
      
      order = maxOrderTask ? maxOrderTask.order + 1 : 0;
    }

    const task = await Task.create({
      title,
      description: description || '',
      priority: priority || 'medium',
      dueDate,
      assignedTo,
      createdBy: req.user.id,
      board: boardId,
      column: columnId,
      order,
      team: board.team
    });

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email');

    try {
      await logTaskActivity(req.user.id, 'created_task', task._id, boardId, columnId, { 
        taskTitle: title,
        priority,
        assignedTo: assignedTo || null
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const boards = await Board.find({
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    });
    
    const boardIds = boards.map(board => board._id);
    
    const teams = await Team.find({
      $or: [
        { owner: userId },
        { admins: userId },
        { members: { $elemMatch: { user: userId } } }
      ]
    });
    
    const teamIds = teams.map(team => team._id);
    
    const tasks = await Task.find({
      $or: [
        { board: { $in: boardIds } },
        { team: { $in: teamIds } },
        { assignedTo: userId },
        { createdBy: userId }
      ]
    })
    .populate('createdBy', 'name username avatar')
    .populate('assignedTo', 'name username avatar email')
    .populate('completedBy', 'name username avatar')
    .populate({
      path: 'board',
      select: 'title description'
    })
    .populate({
      path: 'column',
      select: 'name order'
    })
    .sort({ updatedAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === 'all') {
      return getAllTasks(req, res);
    }
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    // Find task and populate related fields
    const task = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email')
      .populate('board', 'title')
      .populate('column', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get the board to check permissions
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }

    // Check user permission
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this task'
      });
    }

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Move a task between columns or change order
 */
const moveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { destinationColumnId, order } = req.body;

    if (destinationColumnId === undefined && order === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Either destinationColumnId or order is required'
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }

    // Check user permission
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to move tasks in this board'
      });
    }

    // Store original values for activity log
    const originalColumnId = task.column;
    const originalOrder = task.order;

    // Update column if provided
    if (destinationColumnId) {
      // Verify the destination column belongs to the same board
      const destinationColumn = await Column.findOne({
        _id: destinationColumnId,
        board: task.board
      });

      if (!destinationColumn) {
        return res.status(400).json({
          success: false,
          message: 'Destination column not found in this board'
        });
      }

      task.column = destinationColumnId;
    }

    // Update order if provided
    if (order !== undefined) {
      task.order = order;
    }

    // Update timestamps
    task.updatedAt = Date.now();

    await task.save();

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'moved_task',
      taskId: task._id,
      boardId: task.board,
      columnId: task.column,
      metadata: {
        taskTitle: task.title,
        fromColumn: originalColumnId,
        toColumn: destinationColumnId || task.column,
        fromOrder: originalOrder,
        toOrder: order
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Task moved successfully',
      data: task
    });
  } catch (error) {
    console.error('Move task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while moving task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update task details
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, assignedTo, status } = req.body;
    
    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task'
      });
    }
    
    const originalTitle = task.title;
    const originalAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;
    
    // Update task fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status !== undefined) task.status = status;
    
    task.updatedAt = Date.now();
    await task.save();
    
    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'updated_task',
      taskId: task._id,
      boardId: task.board,
      columnId: task.column,
      metadata: {
        taskTitle: task.title,
        changes: {
          title: title !== originalTitle ? { from: originalTitle, to: title } : undefined,
          assignedTo: assignedTo !== originalAssignedTo ? { from: originalAssignedTo, to: assignedTo } : undefined,
        }
      }
    });
    
    // Return updated task
    const updatedTask = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email');
    
    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task'
      });
    }
    
    await Task.deleteOne({ _id: id });
    
    try {
      await Activity.create({
        user: req.user.id,
        action: 'deleted_task',
        boardId: task.board,
        columnId: task.column,
        teamId: board.team,
        metadata: { 
          taskTitle: task.title,
          taskId: task._id.toString()
        }
      });
    } catch (error) {
      console.error('Failed to log task deletion:', error);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task'
      });
    }
    
    task.status = 'done';
    task.completedAt = Date.now();
    task.completedBy = req.user.id;
    task.updatedAt = Date.now();
    
    await task.save();
    
    try {
      await logTaskActivity(req.user.id, 'completed_task', task._id, task.board, task.column, {
        taskTitle: task.title
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    const updatedTask = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email')
      .populate('completedBy', 'name username avatar')
      .populate('board', 'title')
      .populate('column', 'name');
    
    return res.status(200).json({
      success: true,
      message: 'Task marked as complete',
      data: updatedTask
    });
  } catch (error) {
    console.error('Complete task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while completing task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const reopenTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    const hasPermission = await checkBoardPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task'
      });
    }
    
    task.status = 'todo';
    task.completedAt = null;
    task.completedBy = null;
    task.updatedAt = Date.now();
    
    await task.save();
    
    try {
      await logTaskActivity(req.user.id, 'reopened_task', task._id, task.board, task.column, {
        taskTitle: task.title
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    const updatedTask = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email')
      .populate('board', 'title')
      .populate('column', 'name');
    
    return res.status(200).json({
      success: true,
      message: 'Task reopened',
      data: updatedTask
    });
  } catch (error) {
    console.error('Reopen task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while reopening task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTask,
  createTaskFromBody,
  getAllTasks,
  getTaskById,
  updateTask,
  moveTask,
  completeTask,
  reopenTask,
  deleteTask
};