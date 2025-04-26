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
    
    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const originalTitle = task.title;
    const originalAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;
    
    // Check if assignee has changed
    let hasAssigneeChanged = false;
    if (assignedTo !== undefined) {
      const newAssignedTo = assignedTo ? assignedTo.toString() : null;
      hasAssigneeChanged = originalAssignedTo !== newAssignedTo;
    }
    
    // Update task fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status !== undefined) task.status = status;
    
    task.updatedAt = Date.now();
    await task.save();
    
    // Create appropriate activity log based on changes
    let actionType = 'updated_task';
    let activityDescription = `Updated task "${task.title}"`;
    
    // Special handling for assignment changes
    if (hasAssigneeChanged) {
      const newAssignedTo = assignedTo ? assignedTo.toString() : null;
      
      if (!originalAssignedTo && newAssignedTo) {
        actionType = 'assigned_task';
        activityDescription = `Assigned task "${task.title}" to a user`;
      } else if (originalAssignedTo && !newAssignedTo) {
        actionType = 'unassigned_task';
        activityDescription = `Unassigned user from task "${task.title}"`;
      } else {
        actionType = 'reassigned_task';
        activityDescription = `Reassigned task "${task.title}" to another user`;
      }
    }
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: actionType,
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: activityDescription,
        metadata: {
          taskTitle: task.title,
          changes: {
            title: title !== originalTitle ? { from: originalTitle, to: title } : undefined,
            assignedTo: hasAssigneeChanged ? { 
              from: originalAssignedTo, 
              to: assignedTo ? assignedTo.toString() : null
            } : undefined,
            priority: priority !== task.priority ? { from: task.priority, to: priority } : undefined
          }
        }
      });
    } catch (activityError) {
      console.error('Activity logging error:', activityError);
    }
    
    // Return updated task with all necessary populated fields
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
    
    // Just delete the task without board permission checks
    await Task.deleteOne({ _id: id });
    
    try {
      await Activity.create({
        user: req.user.id,
        action: 'deleted_task',
        metadata: { 
          taskTitle: task.title || 'Unknown task',
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
    
    // Skip board check entirely
    
    task.status = 'done';
    task.completedAt = new Date();
    task.completedBy = req.user.id;
    task.updatedAt = new Date();
    
    await task.save();
    
    try {
      await Activity.create({
        user: req.user.id,
        action: 'completed_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Completed task "${task.title}"`,
        metadata: {
          taskTitle: task.title
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
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
      message: 'Task marked as complete',
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
    
    // Skip board check entirely
    
    task.status = 'todo';
    task.completedAt = null;
    task.completedBy = null;
    task.updatedAt = new Date();
    
    await task.save();
    
    try {
      await Activity.create({
        user: req.user.id,
        action: 'reopened_task',
        taskId: task._id,
        boardId: task.board,
        columnId: task.column,
        description: `Reopened task "${task.title}"`,
        metadata: {
          taskTitle: task.title
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    const updatedTask = await Task.findById(id)
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
    
    return res.status(200).json({
      success: true,
      message: 'Task reopened',
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

const getTasksByColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(columnId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid column ID format'
      });
    }
    
    const tasks = await Task.find({ column: columnId })
      .sort({ order: 1 })
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
    
    // Add isCompleted flag
    const tasksWithStatus = tasks.map(task => ({
      ...task._doc,
      isCompleted: task.status === 'done'
    }));
    
    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasksWithStatus
    });
  } catch (error) {
    console.error('Get tasks by column error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching column tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Assign a task to a user
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
      // Try a more flexible search with case insensitivity for name or username
      const user = await User.findOne({
        $or: [
          { name: { $regex: new RegExp('^' + userId + '$', 'i') } },
          { username: { $regex: new RegExp('^' + userId + '$', 'i') } }
        ]
      });
      
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
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      assignedUser = user;
    }
    
    console.log(`Assigning task to user: ${assignedUser.name} (${targetUserId})`);
    
    // Check if the task is already assigned to this user
    if (task.assignedTo && task.assignedTo.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Task is already assigned to this user'
      });
    }
    
    // Store the previous assignee for logging
    const previousAssignee = task.assignedTo;
    
    // Always update the assignedTo field with the new user ID
    task.assignedTo = targetUserId;
    task.updatedAt = Date.now();
    await task.save();
    
    // Double-check the assignment was successful
    const checkTask = await Task.findById(id);
    if (!checkTask.assignedTo || checkTask.assignedTo.toString() !== targetUserId.toString()) {
      console.error('Assignment verification failed:', { 
        expected: targetUserId.toString(),
        actual: checkTask.assignedTo ? checkTask.assignedTo.toString() : 'null'
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to assign task - database update verification failed'
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
          assigneeName: assignedUser.name || assignedUser.username,
          previousAssignee: previousAssignee || null
        }
      });
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    // Return updated task with proper population
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

// Unassign a task
const unassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the task with a clean query
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the task is actually assigned to someone
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
    
    // Use findByIdAndUpdate to ensure atomic operation
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { 
        $set: { 
          assignedTo: null,
          updatedAt: Date.now()
        } 
      },
      { new: true }
    );
    
    if (updatedTask.assignedTo) {
      console.error('Failed to unassign task:', updatedTask);
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
    
    // Return updated task with proper population
    const fullUpdatedTask = await Task.findById(id)
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
        ...fullUpdatedTask._doc,
        isCompleted: fullUpdatedTask.status === 'done',
        assignedTo: null  // Explicitly include null assignedTo in the response
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

module.exports = {
  createTask,
  createTaskFromBody,
  getAllTasks,
  getTaskById,
  getTasksByColumn,
  updateTask,
  moveTask,
  completeTask,
  reopenTask,
  deleteTask,
  assignTask,
  unassignTask
};