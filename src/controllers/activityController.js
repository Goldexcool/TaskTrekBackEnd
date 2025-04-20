const Activity = require('../models/Activity');
const Team = require('../models/Team');

// Get recent activities for the current user
const getUserActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const activities = await Activity.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name avatar')
      .populate('targetUser', 'username name avatar')
      .populate('board', 'title')
      .populate('team', 'name avatar')
      .populate('task', 'title');
    
    const total = await Activity.countDocuments({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      count: activities.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity data'
    });
  }
};

// Get team activities
const getTeamActivities = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Check if user is a member of this team
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user.id
    });
    
    if (!team) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this team\'s activities'
      });
    }
    
    const activities = await Activity.find({ team: teamId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name avatar')
      .populate('targetUser', 'username name avatar')
      .populate('board', 'title')
      .populate('team', 'name avatar')
      .populate('task', 'title');
    
    const total = await Activity.countDocuments({ team: teamId });
    
    res.status(200).json({
      success: true,
      count: activities.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching team activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity data'
    });
  }
};

// Get board activities
const getBoardActivities = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get activities for this board
    const activities = await Activity.find({ board: boardId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name avatar')
      .populate('targetUser', 'username name avatar')
      .populate('team', 'name avatar')
      .populate('task', 'title');
    
    const total = await Activity.countDocuments({ board: boardId });
    
    res.status(200).json({
      success: true,
      count: activities.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching board activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity data'
    });
  }
};

// Get task activities
const getTaskActivities = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get activities for this task
    const activities = await Activity.find({ task: taskId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username name avatar')
      .populate('targetUser', 'username name avatar');
    
    const total = await Activity.countDocuments({ task: taskId });
    
    res.status(200).json({
      success: true,
      count: activities.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching task activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity data'
    });
  }
};

// Get activity feed (combined team and user activities)
const getActivityFeed = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching activity feed'
    });
  }
};

module.exports = {
  getUserActivities,
  getTeamActivities,
  getBoardActivities,
  getTaskActivities,
  getActivityFeed
};