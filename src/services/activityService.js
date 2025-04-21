const Activity = require('../models/Activity');
const User = require('../models/User');
const Team = require('../models/Team');
const mongoose = require('mongoose');

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
    return null;
  }
};

/**
 * Log board related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} board - Board or board ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logBoardActivity = async (actionType, user, board, description, metadata = {}, visibility = 'team') => {
  try {
    // Get team ID from board if not provided in metadata
    let team = metadata.team;
    if (!team && typeof board === 'object' && board.team) {
      team = board.team;
    } else if (!team && typeof board === 'string') {
      const boardDoc = await mongoose.model('Board').findById(board);
      if (boardDoc && boardDoc.team) {
        team = boardDoc.team;
      }
    }
    
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      board: typeof board === 'object' ? board._id : board,
      team,
      description,
      metadata,
      visibility
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
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logTaskActivity = async (actionType, user, task, board, column, description, metadata = {}, visibility = 'team') => {
  try {
    // Get team ID from board if not provided in metadata
    let team = metadata.team;
    if (!team && typeof board === 'object' && board.team) {
      team = board.team;
    } else if (!team && typeof board === 'string') {
      const boardDoc = await mongoose.model('Board').findById(board);
      if (boardDoc && boardDoc.team) {
        team = boardDoc.team;
      }
    }
    
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      task: typeof task === 'object' ? task._id : task,
      board: typeof board === 'object' ? board._id : board,
      column: typeof column === 'object' ? column._id : column,
      team,
      description,
      metadata,
      visibility
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
 * @param {Object|String} targetUser - Target user or ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logTeamActivity = async (actionType, user, team, targetUser, description, metadata = {}, visibility = 'team') => {
  try {
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      team: typeof team === 'object' ? team._id : team,
      targetUser: targetUser ? (typeof targetUser === 'object' ? targetUser._id : targetUser) : null,
      description,
      metadata,
      visibility
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
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logColumnActivity = async (actionType, user, column, board, description, metadata = {}, visibility = 'team') => {
  try {
    // Get team ID from board if not provided in metadata
    let team = metadata.team;
    if (!team && typeof board === 'object' && board.team) {
      team = board.team;
    } else if (!team && typeof board === 'string') {
      const boardDoc = await mongoose.model('Board').findById(board);
      if (boardDoc && boardDoc.team) {
        team = boardDoc.team;
      }
    }
    
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      column: typeof column === 'object' ? column._id : column,
      board: typeof board === 'object' ? board._id : board,
      team,
      description,
      metadata,
      visibility
    });
  } catch (error) {
    console.error('Error logging column activity:', error);
  }
};

/**
 * Log user account related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logUserActivity = async (actionType, user, description, metadata = {}, visibility = 'personal') => {
  try {
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      description,
      metadata,
      visibility
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
};

/**
 * Log personal task related activity
 * @param {String} actionType - The type of action
 * @param {Object|String} user - User or user ID
 * @param {Object|String} personalTask - PersonalTask or task ID
 * @param {Object|String} assignedTo - User ID the task is assigned to (optional)
 * @param {String} description - Human readable description
 * @param {Object} metadata - Additional data
 * @param {String} visibility - Visibility level (personal, team, public)
 */
const logPersonalTaskActivity = async (actionType, user, personalTask, assignedTo, description, metadata = {}, visibility = 'personal') => {
  try {
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      personalTask: typeof personalTask === 'object' ? personalTask._id : personalTask,
      targetUser: assignedTo ? (typeof assignedTo === 'object' ? assignedTo._id : assignedTo) : null,
      description,
      metadata,
      visibility
    });
  } catch (error) {
    console.error('Error logging personal task activity:', error);
  }
};

/**
 * Get user-friendly description for an activity
 * @param {String} actionType - The action type
 * @param {Object} actor - The user performing the action
 * @param {Object} context - Context objects (board, task, team, etc.)
 * @returns {String} - Human readable description
 */
const getActivityDescription = (actionType, actor, context) => {
  const actorName = actor?.name || actor?.username || 'A user';
  
  switch (actionType) {
    // Board actions
    case 'create_board':
      return `${actorName} created board "${context.board?.title || 'Untitled'}"`;
    case 'update_board':
      return `${actorName} updated board "${context.board?.title || 'Untitled'}"`;
    case 'delete_board':
      return `${actorName} deleted board "${context.board?.title || 'Untitled'}"`;
      
    // Column actions
    case 'create_column':
      return `${actorName} added column "${context.column?.title || 'Untitled'}" to board "${context.board?.title || 'Untitled'}"`;
    case 'update_column':
      return `${actorName} updated column "${context.column?.title || 'Untitled'}"`;
    case 'delete_column':
      return `${actorName} deleted column "${context.column?.title || 'Untitled'}"`;
    case 'reorder_column':
      return `${actorName} reordered columns in board "${context.board?.title || 'Untitled'}"`;
      
    // Task actions
    case 'create_task':
      return `${actorName} created task "${context.task?.title || 'Untitled'}"`;
    case 'update_task':
      return `${actorName} updated task "${context.task?.title || 'Untitled'}"`;
    case 'delete_task':
      return `${actorName} deleted task "${context.task?.title || 'Untitled'}"`;
    case 'move_task':
      return `${actorName} moved task "${context.task?.title || 'Untitled'}"`;
    case 'complete_task':
      return `${actorName} completed task "${context.task?.title || 'Untitled'}"`;
    case 'reopen_task':
      return `${actorName} reopened task "${context.task?.title || 'Untitled'}"`;
    case 'assign_task':
      return `${actorName} assigned task "${context.task?.title || 'Untitled'}" to ${context.targetUser?.name || 'someone'}`;
    case 'unassign_task':
      return `${actorName} unassigned task "${context.task?.title || 'Untitled'}"`;
      
    // Team actions
    case 'create_team':
      return `${actorName} created team "${context.team?.name || 'Untitled'}"`;
    case 'update_team':
      return `${actorName} updated team "${context.team?.name || 'Untitled'}"`;
    case 'delete_team':
      return `${actorName} deleted team "${context.team?.name || 'Untitled'}"`;
    case 'join_team':
      return `${actorName} joined team "${context.team?.name || 'Untitled'}"`;
    case 'leave_team':
      return `${actorName} left team "${context.team?.name || 'Untitled'}"`;
    case 'invite_user':
      return `${actorName} invited ${context.targetUser?.name || 'someone'} to team "${context.team?.name || 'Untitled'}"`;
    case 'add_member':
      return `${actorName} added ${context.targetUser?.name || 'a new member'} to team "${context.team?.name || 'Untitled'}"`;
    case 'remove_member':
      return `${actorName} removed ${context.targetUser?.name || 'a member'} from team "${context.team?.name || 'Untitled'}"`;
      
    // Personal task actions
    case 'create_personal_task':
      return `${actorName} created personal task "${context.personalTask?.title || 'Untitled'}"`;
    case 'update_personal_task':
      return `${actorName} updated personal task "${context.personalTask?.title || 'Untitled'}"`;
    case 'delete_personal_task':
      return `${actorName} deleted personal task "${context.personalTask?.title || 'Untitled'}"`;
    case 'complete_personal_task':
      return `${actorName} completed personal task "${context.personalTask?.title || 'Untitled'}"`;
    case 'reopen_personal_task':
      return `${actorName} reopened personal task "${context.personalTask?.title || 'Untitled'}"`;
    case 'assign_personal_task':
      return `${actorName} assigned personal task "${context.personalTask?.title || 'Untitled'}" to ${context.targetUser?.name || 'someone'}`;
    case 'unassign_personal_task':
      return `${actorName} unassigned personal task "${context.personalTask?.title || 'Untitled'}"`;
      
    // Default case
    default:
      return `${actorName} performed ${actionType.replace(/_/g, ' ')}`;
  }
};

/**
 * Get activity feed for a user including all teams they belong to
 * @param {String} userId - The user ID
 * @param {Object} options - Query options (pagination, filters)
 * @returns {Promise<Array>} - Array of activity items
 */
const getUserActivityFeed = async (userId, options = {}) => {
  try {
    const {
      limit = 20,
      page = 1,
      actionType,
      teamId,
      boardId,
      startDate,
      endDate
    } = options;
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Get teams the user belongs to
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Find teams the user belongs to
    const teams = await Team.find({
      'members.user': userId
    }).select('_id');
    
    const teamIds = teams.map(team => team._id);
    
    // Build the base query
    const query = {
      $or: [
        // User's personal activities
        { user: userId, visibility: 'personal' },
        
        // Activities in teams the user belongs to
        { team: { $in: teamIds }, visibility: 'team' },
        
        // Public activities
        { visibility: 'public' }
      ]
    };
    
    // Apply additional filters if provided
    if (actionType) {
      query.actionType = actionType;
    }
    
    if (teamId) {
      // Override team filter to show only activities from a specific team
      query.$or = [
        { team: teamId, visibility: { $in: ['team', 'public'] } }
      ];
    }
    
    if (boardId) {
      query.board = boardId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Execute the query with population
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name username email avatar')
      .populate('targetUser', 'name username email avatar')
      .populate('team', 'name description')
      .populate('board', 'title description')
      .populate('task', 'title description')
      .populate('personalTask', 'title description');
    
    // Get total count for pagination info
    const totalCount = await Activity.countDocuments(query);
    
    return {
      activities,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user activity feed:', error);
    throw error;
  }
};

module.exports = {
  createActivity,
  logBoardActivity,
  logTaskActivity,
  logTeamActivity,
  logColumnActivity,
  logUserActivity,
  logPersonalTaskActivity,
  getActivityDescription,
  getUserActivityFeed
};