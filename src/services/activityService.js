const Activity = require('../models/Activity');
const User = require('../models/User');

/**
 * Create an activity record
 * @param {Object} activityData - The activity data
 * @returns {Promise<Object>} - The created activity
 */
const createActivity = async (activityData) => {
  try {
    const activity = await Activity.create(activityData);
    return activity;
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Don't throw - activity logging should not disrupt the main application flow
  }
};

/**
 * Log board related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} board - Board or board ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 */
const logBoardActivity = async (actionType, user, board, description, metadata = {}) => {
  try {
    // Ensure we have the team ID if board is an ID string
    let teamId = null;
    if (typeof board === 'string' || board instanceof mongoose.Types.ObjectId) {
      const boardDoc = await Board.findById(board).select('team');
      teamId = boardDoc?.team;
    } else {
      teamId = board.team;
    }

    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      team: teamId,
      board: typeof board === 'object' ? board._id : board,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging board activity:', error);
  }
};

/**
 * Log task related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} task - Task or task ID
 * @param {Object|String} board - Board or board ID
 * @param {Object|String} column - Column or column ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 */
const logTaskActivity = async (actionType, user, task, board, column, description, metadata = {}) => {
  try {
    // Ensure we have proper IDs if objects are provided
    const taskId = typeof task === 'object' ? task._id : task;
    const columnId = typeof column === 'object' ? column._id : column;
    const userId = typeof user === 'object' ? user._id || user.id : user;
    
    // Get board and team info if not provided
    let boardId = null;
    let teamId = null;
    
    if (board) {
      boardId = typeof board === 'object' ? board._id : board;
      teamId = typeof board === 'object' ? board.team : null;
    }
    
    // If we don't have board info but have column, get it from column
    if (!boardId && columnId) {
      const columnDoc = await Column.findById(columnId).select('board');
      if (columnDoc?.board) {
        boardId = columnDoc.board;
        
        // Get team from board
        const boardDoc = await Board.findById(boardId).select('team');
        teamId = boardDoc?.team;
      }
    }
    
    return await createActivity({
      actionType,
      user: userId,
      team: teamId,
      board: boardId,
      column: columnId,
      task: taskId,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging task activity:', error);
  }
};

/**
 * Log team related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} team - Team or team ID
 * @param {Object|String} targetUser - Target user or ID (for invite/assign actions)
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 */
const logTeamActivity = async (actionType, user, team, targetUser, description, metadata = {}) => {
  try {
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      team: typeof team === 'object' ? team._id : team,
      targetUser: targetUser ? (typeof targetUser === 'object' ? targetUser._id : targetUser) : null,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging team activity:', error);
  }
};

/**
 * Log column related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} column - Column or column ID
 * @param {Object|String} board - Board or board ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 */
const logColumnActivity = async (actionType, user, column, board, description, metadata = {}) => {
  try {
    // Get board if not provided
    let boardId = null;
    let teamId = null;
    
    if (board) {
      boardId = typeof board === 'object' ? board._id : board;
      teamId = typeof board === 'object' ? board.team : null;
    } else if (column) {
      const columnDoc = typeof column === 'object' ? column : await Column.findById(column).select('board');
      boardId = typeof column === 'object' ? column.board : columnDoc?.board;
      
      // Get team from board
      if (boardId) {
        const boardDoc = await Board.findById(boardId).select('team');
        teamId = boardDoc?.team;
      }
    }
    
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      team: teamId,
      board: boardId,
      column: typeof column === 'object' ? column._id : column,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging column activity:', error);
  }
};

module.exports = {
  createActivity,
  logBoardActivity,
  logTaskActivity,
  logTeamActivity,
  logColumnActivity
};