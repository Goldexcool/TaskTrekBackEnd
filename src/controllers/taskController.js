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
  // Always return true to allow all users access to all tasks/boards
  return true;
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

    let taskAssignee = null;
    
    if (assignedTo) {
      if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
        const user = await User.findOne({
          $or: [
            { name: assignedTo },
            { username: assignedTo }
          ]
        });
        
        if (user) {
          taskAssignee = user._id;
        } else {
          return res.status(400).json({
            success: false,
            message: `Could not find user "${assignedTo}"`
          });
        }
      } else {
        // If it's a valid ObjectId, use it directly
        taskAssignee = assignedTo;
      }
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
      assignedTo: taskAssignee,
      createdBy: req.user.id,
      board: boardId,
      column: columnId,
      order,
      team: board.team
    });

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email')
      .populate({
        path: 'board',
        select: 'title description'
      })
      .populate({
        path: 'column',
        select: 'name order'
      })
      .populate({
        path: 'team',
        select: 'name'
      });

    // Create activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'created_task',
        taskId: task._id,
        boardId,
        columnId,
        teamId: board.team,
        description: `Created task "${task.title}"`,
        metadata: { 
          taskTitle: title,
          priority,
          assignedTo: taskAssignee
        }
      });
    } catch (activityError) {
      console.error('Activity logging error:', activityError);
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        ...populatedTask._doc,
        isCompleted: false
      }
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
    // Get all tasks without filtering by user
    const tasks = await Task.find({})
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
      .populate({
        path: 'team',
        select: 'name'
      })
      .sort({ updatedAt: -1 });
    
    // Add isCompleted flag based on status
    const tasksWithStatus = tasks.map(task => ({
      ...task._doc,
      isCompleted: task.status === 'done'
    }));
    
    return res.status(200).json({
      success: true,
      count: tasksWithStatus.length,
      data: tasksWithStatus
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
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('assignedTo', 'name username avatar email')
      .populate('completedBy', 'name username avatar')
      .populate({
        path: 'board',
        select: 'title description createdBy members team'
      })
      .populate({
        path: 'column',
        select: 'name order'
      });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...task._doc,
        isCompleted: task.status === 'done'
      }
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
    
    console.log('Update task request received:', {
      id,
      assignedTo,
      otherFields: { title, description, priority, dueDate, status }
    });
    
    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Handle assignedTo specially
    let assignedUser = null;
    let targetAssigneeId = null;
    
    if (assignedTo !== undefined) {
      if (assignedTo) {
        // Try to find user by ID, name or username
        if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          assignedUser = await User.findById(assignedTo);
          if (assignedUser) {
            targetAssigneeId = assignedUser._id;
          }
        } else {
          // Try to find by name or username
          assignedUser = await User.findOne({
            $or: [
              { name: { $regex: new RegExp(assignedTo, 'i') } },
              { username: { $regex: new RegExp(assignedTo, 'i') } }
            ]
          });
          if (assignedUser) {
            targetAssigneeId = assignedUser._id;
          }
        }
        
        if (!assignedUser) {
          return res.status(404).json({
            success: false,
            message: `User "${assignedTo}" not found`
          });
        }
      } else {
        // If assignedTo is null, empty string, or false, explicitly set to null
        targetAssigneeId = null;
      }
      
      console.log(
        'Assignee determination:', 
        targetAssigneeId ? 
          `Will assign to: ${assignedUser.name} (${targetAssigneeId})` : 
          'Will clear assignee'
      );
    }
    
    // Build update object
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (status !== undefined) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = targetAssigneeId;
    updateData.updatedAt = new Date();
    
    console.log('Update operation with data:', updateData);
    
    // Perform direct update
    const result = await Task.updateOne(
      { _id: id },
      { $set: updateData }
    );
    
    console.log('Update result:', result);
    
    if (result.modifiedCount !== 1) {
      console.error('Task update failed or no changes made:', result);
      // Continue anyway as this might just mean no actual changes were needed
    }
    
    // Get the updated task
    const updatedTask = await Task.findById(id)
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
      .populate({
        path: 'team',
        select: 'name'
      });
      
    console.log('Task after update:', {
      id: updatedTask._id,
      assignedTo: updatedTask.assignedTo ? 
        `${updatedTask.assignedTo.name || updatedTask.assignedTo.username}` : 
        'No assignee'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: {
        ...updatedTask._doc,
        isCompleted: updatedTask.status === 'done'
      }
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

/**
 * Assign a task to a user
 */
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    console.log('Attempting to assign task', id, 'to user', userId);
    
    // First, find the task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Handle user ID lookup if it's not a valid ObjectId (e.g., username provided)
    let targetUserId = userId;
    let assignedUser = null;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('User ID is not a valid ObjectId, searching by name/username');
      // Try a more flexible search with case insensitivity for name or username
      const user = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(userId, 'i') } }, // Remove ^ and $ for more flexible matching
          { username: { $regex: new RegExp(userId, 'i') } }
        ]
      });
      
      console.log('User search result:', user ? `Found: ${user.name}` : 'Not found');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User "${userId}" not found`
        });
      }
      targetUserId = user._id;
      assignedUser = user;
    } else {
      // Check if user exists when a valid ObjectId is provided
      console.log('Looking up user by ObjectId');
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      assignedUser = user;
    }
    
    console.log(`Found user to assign: ${assignedUser.name || assignedUser.username} (${targetUserId})`);
    
    // Direct update with minimal fields to avoid validation issues
    console.log('Performing direct update operation');
    const result = await Task.updateOne(
      { _id: id },
      { $set: { assignedTo: targetUserId, updatedAt: new Date() } }
    );
    
    console.log('Update result:', result);
    
    if (result.modifiedCount !== 1) {
      console.error('Task update failed:', result);
      return res.status(500).json({
        success: false,
        message: 'Failed to update task assignee'
      });
    }
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'assigned_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Assigned task "${task.title}" to ${assignedUser.name || assignedUser.username}`,
        metadata: {
          taskTitle: task.title,
          assignedTo: targetUserId,
          assigneeName: assignedUser.name || assignedUser.username
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    // Get the freshly updated task
    const updatedTask = await Task.findById(id)
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
      .populate({
        path: 'team',
        select: 'name'
      });
    
    console.log('Updated task retrieved:', 
      updatedTask.assignedTo ? 
      `Assigned to: ${updatedTask.assignedTo.name || updatedTask.assignedTo.username}` : 
      'No assignee set'
    );
    
    return res.status(200).json({
      success: true,
      message: `Task assigned successfully to ${assignedUser.name || assignedUser.username}`,
      data: {
        ...updatedTask._doc,
        isCompleted: updatedTask.status === 'done'
      }
    });
  } catch (error) {
    console.error('Assign task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while assigning task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};