const mongoose = require('mongoose');
const Board = require('../models/Board');
const Team = require('../models/Team');
const Column = require('../models/Column');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const { logBoardActivity } = require('../services/activityService');

/**
 * Create a new board
 * @route POST /api/boards
 */
const createBoard = async (req, res) => {
  try {
    const { title, description, teamId, visibility = 'team' } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Board title is required'
      });
    }

    // Create board
    const board = await Board.create({
      title,
      description,
      team: teamId || null,
      visibility,
      createdBy: req.user.id,
      members: [{
        user: req.user.id,
        role: 'admin',
        addedAt: new Date(),
        addedBy: req.user.id
      }]
    });

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'created_board',
      boardId: board._id,
      teamId: teamId,
      metadata: {
        boardTitle: title,
        visibility
      }
    });

    // Create default columns
    const defaultColumns = [
      { name: 'To Do', order: 0 },
      { name: 'In Progress', order: 1 },
      { name: 'Done', order: 2 }
    ];

    for (const column of defaultColumns) {
      await Column.create({
        name: column.name,
        order: column.order,
        board: board._id,
        createdBy: req.user.id
      });
    }

    // Populate columns after creation
    const populatedBoard = await Board.findById(board._id)
      .populate('createdBy', 'name username avatar')
      .populate({
        path: 'members.user',
        select: 'name username avatar email'
      });

    // If board is created in a team, notify team members via WebSocket
    if (teamId) {
      const team = await Team.findById(teamId).select('members admins owner');
      
      if (team) {
        const teamMembers = [
          ...(team.members || []), 
          ...(team.admins || [])
        ];
        
        if (team.owner) {
          teamMembers.push(team.owner);
        }
        
        const uniqueMembers = [...new Set(teamMembers
          .filter(memberId => memberId && memberId.toString() !== req.user.id)
          .map(memberId => memberId.toString()))];
        
        // Send WebSocket notifications to team members
        const io = req.app.get('io');
        if (io) {
          uniqueMembers.forEach(memberId => {
            io.to(`user:${memberId}`).emit('board:created', {
              boardId: board._id,
              title: board.title,
              creator: {
                id: req.user.id,
                name: req.user.name || req.user.username
              },
              teamId
            });
          });
        }
        
        // Create notifications for team members
        const creator = await User.findById(req.user.id).select('name username');
        const notifications = uniqueMembers.map(memberId => ({
          recipient: memberId,
          type: 'board_created',
          message: `${creator.name || creator.username} created a new board "${title}" in your team`,
          relatedBoard: board._id,
          relatedTeam: teamId,
          initiator: req.user.id,
          read: false
        }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: populatedBoard
    });
  } catch (error) {
    console.error('Create board error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating board',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all boards
const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { createdBy: req.user.id },
        { 'members.user': req.user.id }
      ]
    })
      .populate('team', 'name')
      .populate('createdBy', 'username email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards
    });
  } catch (error) {
    console.error('Error getting boards:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get board by ID
const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const board = await Board.findById(id)
      .populate('createdBy', 'name username avatar')
      .populate('members.user', 'name username avatar email')
      .populate('team', 'name');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // More permissive check - include creator, direct members, and team members
    const isCreator = board.createdBy && board.createdBy._id.toString() === userId;
    const isBoardMember = board.members && board.members.some(m => 
      m.user && (m.user._id || m.user).toString() === userId
    );
    
    let isTeamMember = false;
    if (board.team) {
      const team = await Team.findById(board.team);
      isTeamMember = team && (
        team.owner.toString() === userId || 
        team.admins.some(id => id.toString() === userId) ||
        team.members.some(m => (m.user || m).toString() === userId)
      );
    }

    if (!isCreator && !isBoardMember && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this board'
      });
    }

    // Add columns for this board
    const columns = await Column.find({ board: id }).sort('order');

    return res.status(200).json({
      success: true,
      data: {
        ...board._doc,
        columns
      }
    });
  } catch (error) {
    console.error('Get board error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching board',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update board
const updateBoard = async (req, res) => {
  try {
    const boardId = req.params.id;
    const { title, description, backgroundColor, colorScheme, image } = req.body;
    
    // Find board
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Check ownership
    if (board.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this board'
      });
    }
    
    // Find and update the board
    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(backgroundColor && { backgroundColor }),
        ...(colorScheme && { colorScheme }),
        ...(image && { image })
      },
      { new: true, runValidators: true }
    ).populate('team', 'name avatar')
     .populate('createdBy', 'username email name avatar');
    
    // Log activity
    await logBoardActivity(
      'update_board',
      req.user,
      updatedBoard,
      `${req.user.username || 'A user'} updated board "${updatedBoard.title}"`,
      { updatedFields: Object.keys(req.body) }
    );
    
    res.status(200).json({
      success: true,
      data: updatedBoard
    });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete board
const deleteBoard = async (req, res) => {
  try {
    const boardId = req.params.id;
    
    // Add validation to check if boardId exists
    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: 'Board ID is required'
      });
    }
    
    console.log('Attempting to delete board with ID:', boardId);
    
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    if (board.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this board'
      });
    }
    
    // Use findByIdAndDelete for a more reliable operation
    await Board.findByIdAndDelete(boardId);
    
    // Additionally, you might want to delete related columns and tasks
    const deletedColumns = await Column.deleteMany({ board: boardId });
    console.log(`Deleted ${deletedColumns.deletedCount} columns`);
    
    // Log activity
    await logBoardActivity(
      'delete_board',
      req.user,
      board,
      `${req.user.username || 'A user'} deleted board "${board.title}"`,
      { boardTitle: board.title }
    );
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Board and all associated columns deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getBoardsByTeam = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    console.log('Getting boards for team ID:', teamId);
    
    // Find boards for this team
    const boards = await Board.find({ team: teamId })
      .populate('createdBy', 'username email')
      .sort({ updatedAt: -1 });
    
    console.log(`Found ${boards.length} boards for team`);
    
    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards
    });
  } catch (error) {
    console.error('Error getting team boards:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getAllBoardsComplete = async (req, res) => {
  try {
    console.log('Getting complete boards data for user ID:', req.user.id);
    
    const userTeams = await Team.find({ 
      'members.user': req.user.id 
    }).select('_id');
    
    const teamIds = userTeams.map(team => team._id);
    console.log(`User is member of ${teamIds.length} teams`);
    
    const boards = await Board.find({ 
      $or: [
        { createdBy: req.user.id },
        { team: { $in: teamIds } }
      ] 
    })
    .populate('team', 'name avatar')
    .populate('createdBy', 'username email name avatar');
    
    console.log(`Found ${boards.length} boards`);
    
    if (boards.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const boardIds = boards.map(board => board._id);
    console.log('Board IDs:', boardIds);
    
    const columns = await Column.find({ board: { $in: boardIds } })
      .sort({ position: 1 });
    
    console.log(`Found ${columns.length} columns`);

    const columnIds = columns.map(column => column._id);
    
    const tasks = await Task.find({ column: { $in: columnIds } })
      .populate('assignedTo', 'username email name avatar')
      .populate('createdBy', 'username email name avatar')
      .sort({ position: 1 });
      
    console.log(`Found ${tasks.length} tasks`);
    
    const completeBoards = boards.map(board => {
      const boardColumns = columns
        .filter(column => column.board.toString() === board._id.toString())
        .map(column => {
          const columnTasks = tasks
            .filter(task => task.column.toString() === column._id.toString())
            .map(task => ({
              id: task._id,
              title: task.title,
              description: task.description || '',
              position: task.position || 0,
              dueDate: task.dueDate,
              priority: task.priority || 'medium',
              labels: task.labels || [],
              assignedTo: task.assignedTo,
              createdBy: task.createdBy,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
            }));
          
          return {
            id: column._id,
            title: column.title,
            position: column.position || 0,
            tasks: columnTasks,
            tasksCount: columnTasks.length,
            createdAt: column.createdAt,
            updatedAt: column.updatedAt
          };
        });
      
      return {
        id: board._id,
        title: board.name || board.title,
        description: board.description || '',
        team: board.team,
        createdBy: board.createdBy,
        backgroundColor: board.backgroundColor || '#f5f5f5',
        colorScheme: board.colorScheme || 'default',
        image: board.image,
        columns: boardColumns,
        columnsCount: boardColumns.length,
        totalTasks: boardColumns.reduce((sum, column) => sum + column.tasksCount, 0),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        isCreator: board.createdBy._id.toString() === req.user.id
      };
    });
    
    res.status(200).json({
      success: true,
      count: completeBoards.length,
      data: completeBoards
    });
  } catch (error) {
    console.error('Get all boards complete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving board data'
    });
  }
};

module.exports = { 
  createBoard, 
  getBoards, 
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardsByTeam,
  getAllBoardsComplete
};