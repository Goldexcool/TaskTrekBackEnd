const Activity = require('../models/Activity');


const generateDescription = (action, metadata = {}) => {
  switch (action) {
    case 'created_task':
      return `Created task "${metadata.taskTitle || 'Untitled'}"`;
    case 'updated_task':
      return `Updated task "${metadata.taskTitle || 'Untitled'}"`;
    case 'moved_task':
      return `Moved task "${metadata.taskTitle || 'Untitled'}"`;
    case 'deleted_task':
      return `Deleted task "${metadata.taskTitle || 'Untitled'}"`;
    case 'created_board':
      return `Created board "${metadata.boardTitle || 'Untitled'}"`;
    case 'created_team':
      return `Created team "${metadata.teamName || 'Untitled'}"`;
    default:
      return `Performed action: ${action.replace(/_/g, ' ')}`;
  }
};

const logTaskActivity = async (userId, action, taskId, boardId, columnId, metadata = {}) => {
  try {
    await Activity.create({
      user: userId,
      action,
      description: generateDescription(action, metadata),
      taskId,
      boardId,
      columnId,
      metadata,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Error logging task activity (${action}):`, error);
  }
};


const logBoardActivity = async (userId, action, boardId, metadata = {}) => {
  try {
    await Activity.create({
      user: userId,
      action,
      description: generateDescription(action, metadata),
      boardId,
      metadata,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Error logging board activity (${action}):`, error);
  }
};


const logTeamActivity = async (userId, action, teamId, metadata = {}) => {
  try {
    const description = generateDescription(action, metadata);
    
    await Activity.create({
      user: userId,
      action,
      description,
      teamId,
      metadata,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Error logging team activity (${action}):`, error);
  }
};

module.exports = {
  logTaskActivity,
  logBoardActivity,
  logTeamActivity
};