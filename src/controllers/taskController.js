const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Team = require('../models/Team'); 
const User = require('../models/User'); 
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { logTaskActivity } = require('../services/activityService');
const mongoose = require('mongoose');

const getBoardPermissionLevel = async (board, userId) => {
  // Board creator has admin privileges
  if (board.createdBy && board.createdBy.toString() === userId) {
    return 'admin';
  }
  
  // Check board member role
  if (board.members && Array.isArray(board.members)) {
    const memberEntry = board.members.find(member => 
      member.user && member.user.toString() === userId
    );
    
    if (memberEntry && memberEntry.role) {
      return memberEntry.role; // 'admin', 'editor', or 'viewer'
    }
  }
  
  // Check team permissions if board belongs to a team
  if (board.team) {
    const team = await Team.findById(board.team);
    if (team) {
      // Team owner has admin privileges
      if (team.owner && team.owner.toString() === userId) {
        return 'admin';
      }
      
      // Team admins have admin privileges on all team boards
      if (team.admins && team.admins.some(adminId => adminId.toString() === userId)) {
        return 'admin';
      }
      
      // Team members have at least viewer access
      if (team.members && team.members.some(memberId => 
        typeof memberId === 'object' 
          ? memberId.user && memberId.user.toString() === userId
          : memberId.toString() === userId
      )) {
        return 'viewer';
      }
    }
  }
  
  // No permission
  return null;
};

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
    const board = await Board.findById(boardId)
      .populate('members.user', 'name username');
      
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
    const permission = await getBoardPermissionLevel(board, req.user.id);
    
    // Tasks can be created by admins and editors, but not viewers
    if (!permission || permission === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'You need editor or admin permissions to create tasks'
      });
    }

    // Get max order in the column
    const maxOrderTask = await Task.findOne({ column: columnId })
      .sort({ order: -1 })
      .limit(1);
    
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    // Create task
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

    // Create notification for assigned user
    if (assignedTo && assignedTo !== req.user.id) {
      const notification = await Notification.create({
        recipient: assignedTo,
        type: 'task_assigned',
        message: `You were assigned to task "${title}"`,
        relatedTask: task._id,
        relatedBoard: boardId,
        relatedTeam: board.team,
        initiator: req.user.id,
        read: false
      });

      // Send WebSocket notification to assigned user
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${assignedTo}`).emit('notification', {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          relatedTask: task._id,
          relatedBoard: boardId,
          read: false,
          createdAt: notification.createdAt
        });

        io.to(`user:${assignedTo}`).emit('task:assigned', {
          taskId: task._id,
          boardId,
          title: task.title,
          assigner: {
            id: req.user.id,
            name: req.user.name || req.user.username
          }
        });
      }
    }

    // Notify all board members about new task
    const boardMembers = board.members.map(m => m.user.toString()).filter(id => id !== req.user.id);
    const io = req.app.get('io');
    
    if (io && boardMembers.length > 0) {
      boardMembers.forEach(memberId => {
        io.to(`user:${memberId}`).emit('task:created', {
          boardId,
          columnId,
          task: {
            _id: task._id,
            title: task.title,
            priority: task.priority,
            assignedTo: task.assignedTo ? {
              _id: populatedTask.assignedTo?._id,
              name: populatedTask.assignedTo?.name,
              username: populatedTask.assignedTo?.username,
              avatar: populatedTask.assignedTo?.avatar
            } : null,
            createdBy: {
              _id: req.user.id,
              name: req.user.name || req.user.username
            },
            order: task.order,
            createdAt: task.createdAt
          }
        });
      });
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

/**
 * Move a task between columns or change order
 * @route PATCH /api/tasks/:id/move
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

    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get the board to check permissions
    const board = await Board.findById(task.board)
      .populate('members.user', 'name username');
      
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }

    // Check user permission
    const permission = await getBoardPermissionLevel(board, req.user.id);
    
    // Tasks can be moved by admins and editors, but not viewers
    if (!permission || permission === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'You need editor or admin permissions to move tasks'
      });
    }

    // Store original values for activity log and WebSocket
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

    // Notify all board members about task move via WebSocket
    const io = req.app.get('io');
    const memberIds = board.members
      .map(member => member.user.toString())
      .filter(id => id !== req.user.id); // Don't notify mover

    if (io && memberIds.length > 0) {
      memberIds.forEach(memberId => {
        io.to(`user:${memberId}`).emit('task:moved', {
          taskId: task._id,
          boardId: board._id,
          fromColumnId: originalColumnId,
          toColumnId: destinationColumnId || task.column,
          order: task.order,
          mover: {
            id: req.user.id,
            name: req.user.name || req.user.username
          }
        });
      });
    }

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

module.exports = {
  createTask,
  moveTask
};