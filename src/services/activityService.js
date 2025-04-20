const Activity = require('../models/Activity');
const User = require('../models/User');
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
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
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
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      task: typeof task === 'object' ? task._id : task,
      board: typeof board === 'object' ? board._id : board,
      column: typeof column === 'object' ? column._id : column,
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
 * @param {Object|String} targetUser - Target user or ID
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
    return await createActivity({
      actionType,
      user: typeof user === 'object' ? user._id || user.id : user,
      column: typeof column === 'object' ? column._id : column,
      board: typeof board === 'object' ? board._id : board,
      description,
      metadata
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
 */
const logUserActivity = async (actionType, user, description, metadata = {}) => {
  console.log('Activity logged:', { actionType, user, description, metadata });
  // Just log for now, don't try to create in DB
  return true;
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
      
    // Default case
    default:
      return `${actorName} performed ${actionType.replace(/_/g, ' ')}`;
  }
};

module.exports = {
  createActivity,
  logBoardActivity,
  logTaskActivity,
  logTeamActivity,
  logColumnActivity,
  logUserActivity,
  getActivityDescription
};