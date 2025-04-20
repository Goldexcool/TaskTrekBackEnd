const Board = require('../models/Board');
const Team = require('../models/Team');
const Column = require('../models/Column');
const Task = require('../models/Task');
const { logBoardActivity } = require('../services/activityService');

// Create a new board
const createBoard = async (req, res) => {
  try {
    const { title, description, teamId, backgroundColor, colorScheme, image } = req.body;
    
    // Validate required fields
    if (!title || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and team ID'
      });
    }
    
    const board = await Board.create({
      title,
      description,
      team: teamId,
      createdBy: req.user.id,
      backgroundColor,  
      colorScheme,      
      image
    });
    
    // Log activity
    await logBoardActivity(
      'create_board',
      req.user,
      board,
      `${req.user.username || 'A user'} created board "${title}"`,
      { boardTitle: title }
    );
    
    res.status(201).json({
      success: true,
      data: board
    });
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all boards for a user
const getBoards = async (req, res) => {
  try {
    console.log('Getting boards for user ID:', req.user.id);
    
    // Find boards created by this user or in teams they belong to
    const boards = await Board.find({
      $or: [
        { createdBy: req.user.id }, // Boards created by the user
      ]
    })
    .populate('team', 'name')
    .sort({ updatedAt: -1 });
    
    console.log(`Found ${boards.length} boards`);
    
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
    const board = await Board.findById(req.params.id)
      .populate('team', 'name')
      .populate('createdBy', 'username email');
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Make sure the board belongs to the user or user is in the team
    const isCreator = board.createdBy._id.toString() === req.user.id;
    
    // If needed, you can also check if user is in the team
    // const isTeamMember = await Team.findOne({
    //   _id: board.team._id,
    //   'members.user': req.user.id
    // });
    
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this board'
      });
    }
    
    res.status(200).json({
      success: true,
      data: board
    });
  } catch (error) {
    console.error('Error getting board by ID:', error);
    res.status(500).json({
      success: false,
      message: error.message
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
        // Only update fields that are provided
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
    
    // Make sure the board belongs to the user
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

// Get boards by team
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

// @desc    Get detailed view of all boards with columns and tasks
// @route   GET /api/boards/complete
// @access  Private
const getAllBoardsComplete = async (req, res) => {
  try {
    console.log('Getting complete boards data for user ID:', req.user.id);
    
    // First, find all teams the user is a member of
    const userTeams = await Team.find({ 
      'members.user': req.user.id 
    }).select('_id');
    
    const teamIds = userTeams.map(team => team._id);
    console.log(`User is member of ${teamIds.length} teams`);
    
    // Find all boards created by the user OR belonging to teams the user is part of
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
    
    // Get all columns and tasks for these boards
    const boardIds = boards.map(board => board._id);
    console.log('Board IDs:', boardIds);
    
    // Get all columns for these boards
    const columns = await Column.find({ board: { $in: boardIds } })
      .sort({ position: 1 });
    
    console.log(`Found ${columns.length} columns`);
    
    // Get all tasks for these boards by looking at their columns
    // Since Task model might not have a direct reference to board
    const columnIds = columns.map(column => column._id);
    
    const tasks = await Task.find({ column: { $in: columnIds } })
      .populate('assignedTo', 'username email name avatar')
      .populate('createdBy', 'username email name avatar')
      .sort({ position: 1 });
      
    console.log(`Found ${tasks.length} tasks`);
    
    // Organize data by board
    const completeBoards = boards.map(board => {
      // Get columns for this board
      const boardColumns = columns
        .filter(column => column.board.toString() === board._id.toString())
        .map(column => {
          // Get tasks for this column
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

// Export all functions
module.exports = { 
  createBoard, 
  getBoards, 
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardsByTeam,
  getAllBoardsComplete
};