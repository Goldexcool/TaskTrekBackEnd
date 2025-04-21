const Activity = require('../models/Activity');
const Team = require('../models/Team');
const { getUserActivityFeed } = require('../services/activityService');

/**
 * Get activity feed for the authenticated user
 * @route GET /api/activities
 * @access Private
 */
const getActivityFeed = async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      actionType: req.query.actionType,
      teamId: req.query.teamId,
      boardId: req.query.boardId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const activityFeed = await getUserActivityFeed(req.user.id, options);
    
    res.status(200).json({
      success: true,
      data: activityFeed.activities,
      pagination: activityFeed.pagination
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity feed'
    });
  }
};

/**
 * Get team activity feed
 * @route GET /api/activities/team/:teamId
 * @access Private
 */
const getTeamActivityFeed = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      teamId, // Explicitly filter by this team
      actionType: req.query.actionType,
      boardId: req.query.boardId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const activityFeed = await getUserActivityFeed(req.user.id, options);
    
    res.status(200).json({
      success: true,
      data: activityFeed.activities,
      pagination: activityFeed.pagination
    });
  } catch (error) {
    console.error('Error fetching team activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching team activity feed'
    });
  }
};

module.exports = {
  getActivityFeed,
  getTeamActivityFeed
};