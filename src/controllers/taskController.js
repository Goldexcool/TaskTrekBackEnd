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
 * Create a task from board/column route
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

    // Handle assignedTo field
    let taskAssignee = null;
    
    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        const user = await User.findOne({
          $or: [
            { name: { $regex: new RegExp(assignedTo, 'i') } },
            { username: { $regex: new RegExp(assignedTo, 'i') } }
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
        taskAssignee = assignedTo;
      }
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

    // Log activity
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

/**
 * Unassign a task from a user
 */
const unassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the task is already unassigned
    if (!task.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Task is already unassigned'
      });
    }
    
    // Store who was previously assigned for the activity log
    const previouslyAssigned = task.assignedTo;
    
    // Find the user who was previously assigned for logging purposes
    let previousUser;
    try {
      previousUser = await User.findById(previouslyAssigned).select('name username');
    } catch (userError) {
      console.error('Error finding previous user:', userError);
    }
    
    // Use updateOne for atomic operation
    const result = await Task.updateOne(
      { _id: id },
      { 
        $set: { 
          assignedTo: null,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount !== 1) {
      console.error('Task unassignment failed:', result);
      return res.status(500).json({
        success: false,
        message: 'Failed to unassign task, please try again'
      });
    }
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'unassigned_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Unassigned ${previousUser ? previousUser.name || previousUser.username : 'a user'} from task "${task.title}"`,
        metadata: {
          taskTitle: task.title,
          previouslyAssigned: previouslyAssigned.toString(),
          previousUserName: previousUser ? previousUser.name || previousUser.username : undefined
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    // Get updated task with populated fields
    const updatedTask = await Task.findById(id)
      .populate('createdBy', 'name username avatar')
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
    
    return res.status(200).json({
      success: true,
      message: 'Task unassigned successfully',
      data: {
        ...updatedTask._doc,
        isCompleted: updatedTask.status === 'done',
        assignedTo: null  // Explicitly include null assignedTo in response
      }
    });
  } catch (error) {
    console.error('Unassign task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while unassigning task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Complete a task
 */
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
    
    // Check if task is already completed
    if (task.status === 'done') {
      return res.status(400).json({
        success: false,
        message: 'Task is already completed'
      });
    }
    
    // Update task status to done
    task.status = 'done';
    task.completedBy = req.user.id;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await task.save();
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'completed_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Completed task "${task.title}"`,
        metadata: {
          taskTitle: task.title,
          completedBy: req.user.id
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    // Get updated task with populated fields
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
    
    return res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      data: {
        ...updatedTask._doc,
        isCompleted: true
      }
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

/**
 * Reopen a completed task
 */
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
    
    // Check if task is already open
    if (task.status !== 'done') {
      return res.status(400).json({
        success: false,
        message: 'Task is already open'
      });
    }
    
    // Update task status to todo
    task.status = 'todo';
    task.completedBy = null;
    task.completedAt = null;
    task.updatedAt = new Date();
    
    await task.save();
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'reopened_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Reopened task "${task.title}"`,
        metadata: {
          taskTitle: task.title,
          reopenedBy: req.user.id
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    // Get updated task with populated fields
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
    
    return res.status(200).json({
      success: true,
      message: 'Task reopened successfully',
      data: {
        ...updatedTask._doc,
        isCompleted: false
      }
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

/**
 * Get tasks by user ID
 */
const getTasksByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if valid user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const tasks = await Task.find({ assignedTo: userId })
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
    
    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks.map(task => ({
        ...task._doc,
        isCompleted: task.status === 'done'
      }))
    });
  } catch (error) {
    console.error('Get tasks by user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get tasks by column ID
 */
const getTasksByColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    // Check if valid column ID
    if (!mongoose.Types.ObjectId.isValid(columnId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid column ID'
      });
    }
    
    const tasks = await Task.find({ column: columnId })
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
      .sort({ order: 1 }); // Sort by task order within column
    
    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks.map(task => ({
        ...task._doc,
        isCompleted: task.status === 'done'
      }))
    });
  } catch (error) {
    console.error('Get tasks by column error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a task
 */
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
    
    // Get board to check permissions
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if user is the creator of the task or has board permissions
    const isCreator = task.createdBy.toString() === req.user.id;
    const hasBoardPermission = await checkBoardPermission(board, req.user.id);
    
    if (!isCreator && !hasBoardPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task'
      });
    }
    
    // Log activity before deletion
    await Activity.create({
      user: req.user.id,
      action: 'deleted_task',
      boardId: task.board,
      columnId: task.column,
      teamId: task.team,
      description: `Deleted task "${task.title}"`,
      metadata: {
        taskTitle: task.title,
        taskId: task._id,
        boardId: task.board,
        columnId: task.column
      }
    });
    
    // Delete the task
    await Task.findByIdAndDelete(id);
    
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

module.exports = {
  createTask,
  createTaskFromBody,
  getAllTasks,
  getTaskById,
  moveTask,
  updateTask,
  assignTask,
  unassignTask,
  completeTask,
  reopenTask,
  getTasksByUser,
  getTasksByColumn,
  deleteTask
};
