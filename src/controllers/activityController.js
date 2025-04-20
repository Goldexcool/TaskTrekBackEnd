const Activity = require('../models/Activity');
const Team = require('../models/Team');

// Get activity feed (combined team and user activities)
const getActivityFeed = async (req, res) => {
  try {
    // For testing - respond with basic success message
    return res.status(200).json({
      success: true,
      message: 'Activity feed endpoint working!',
      userId: req.user?.id || 'Not authenticated'
    });
    
    /* Uncomment when Activity model is ready
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Find team IDs the user belongs to
    const teams = await Team.find({ 'members.user': req.user.id }).select('_id');
    const teamIds = teams.map(team => team._id);
    
    // Get activities from user's teams and user's own activities
    const query = {
      $or: [
        { team: { $in: teamIds } },
        { user: req.user.id }
      ]
    };
    
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name avatar')
      .populate('targetUser', 'username name avatar')
      .populate('board', 'title')
      .populate('team', 'name avatar')
      .populate('task', 'title');
    
    const total = await Activity.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: activities.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: activities
    });
    */
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity feed'
    });
  }
};

// Simple placeholder functions for remaining endpoints
const getUserActivities = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User activities endpoint working!',
    userId: req.user?.id || 'Not authenticated'
  });
};

const getTeamActivities = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Team activities endpoint working!',
    teamId: req.params.teamId,
    userId: req.user?.id || 'Not authenticated'
  });
};

const getBoardActivities = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Board activities endpoint working!',
    boardId: req.params.boardId,
    userId: req.user?.id || 'Not authenticated'
  });
};

const getTaskActivities = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Task activities endpoint working!',
    taskId: req.params.taskId,
    userId: req.user?.id || 'Not authenticated'
  });
};

module.exports = {
  getActivityFeed,
  getUserActivities,
  getTeamActivities,
  getBoardActivities,
  getTaskActivities
};