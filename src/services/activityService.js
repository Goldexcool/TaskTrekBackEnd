const Activity = require('../models/Activity');

// Create activity record
const createActivity = async (activityData) => {
  try {
    const activity = await Activity.create(activityData);
    return activity;
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Don't throw - activity logging should not disrupt the main application flow
  }
};

// Log board related activity
const logBoardActivity = async (actionType, user, board, description, metadata = {}) => {
  try {
    return await createActivity({
      actionType,
      user: user.id || user,
      team: board.team,
      board: board._id || board,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging board activity:', error);
  }
};

// Log task related activity
const logTaskActivity = async (actionType, user, task, board, column, description, metadata = {}) => {
  try {
    return await createActivity({
      actionType,
      user: user.id || user,
      team: board?.team,
      board: board?._id || board,
      column: column?._id || column,
      task: task._id || task,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging task activity:', error);
  }
};

// Log team related activity
const logTeamActivity = async (actionType, user, team, targetUser, description, metadata = {}) => {
  try {
    return await createActivity({
      actionType,
      user: user.id || user,
      team: team._id || team,
      targetUser: targetUser?._id || targetUser,
      description,
      metadata
    });
  } catch (error) {
    console.error('Error logging team activity:', error);
  }
};

module.exports = {
  createActivity,
  logBoardActivity,
  logTaskActivity,
  logTeamActivity
};