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

// Other helper methods...

module.exports = {
  createActivity,
  // Other exported methods...
};