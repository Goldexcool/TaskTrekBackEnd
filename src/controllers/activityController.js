const Activity = require('../models/Activity');
const Team = require('../models/Team');
const Board = require('../models/Board');
const Task = require('../models/Task');
const { 
  getUserActivityFeed, 
  getBoardActivityFeed: getActivityForBoard,
  getTaskActivityFeed: getActivityForTask,
  getPersonalTaskActivityFeed: getActivityForPersonalTasks
} = require('../services/activityService');

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

/**
 * Get board activity feed
 * @route GET /api/activities/board/:boardId
 * @access Private
 */
const getBoardActivityFeed = async (req, res) => {
  try {
    const { boardId } = req.params;
    
    // Verify the user has access to this board
    const board = await Board.findById(boardId).populate('team');
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Check if user is in the team that owns the board
    const isTeamMember = board.team.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this board'
      });
    }
    
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      boardId,
      actionType: req.query.actionType,
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
    console.error('Error fetching board activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching board activity feed'
    });
  }
};

/**
 * Get task activity feed
 * @route GET /api/activities/task/:taskId
 * @access Private
 */
const getTaskActivityFeed = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Verify the user has access to this task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Get the board and verify access
    const board = await Board.findById(task.board).populate('team');
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Check if user is in the team that owns the board
    const isTeamMember = board.team.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this task'
      });
    }
    
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1
    };
    
    // Get activities for this task
    const activities = await Activity.find({ task: taskId })
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('user', 'name username email avatar')
      .populate('targetUser', 'name username email avatar');
    
    const total = await Activity.countDocuments({ task: taskId });
    
    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching task activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching task activity feed'
    });
  }
};

/**
 * Get personal tasks activity feed
 * @route GET /api/activities/personal-tasks
 * @access Private
 */
const getPersonalTaskActivityFeed = async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      actionType: req.query.actionType,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    // Get personal task activities
    const activities = await Activity.find({ 
      $and: [
        { user: req.user.id },
        { 
          $or: [
            { actionType: { $regex: /^personal_task_/ } },
            { actionType: { $in: [
              'create_personal_task',
              'update_personal_task',
              'delete_personal_task',
              'complete_personal_task',
              'reopen_personal_task',
              'assign_personal_task',
              'unassign_personal_task',
              'archive_personal_task',
              'unarchive_personal_task'
            ]} }
          ]
        }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('user', 'name username email avatar')
      .populate('targetUser', 'name username email avatar')
      .populate('personalTask', 'title description');
    
    const total = await Activity.countDocuments({ 
      $and: [
        { user: req.user.id },
        { 
          $or: [
            { actionType: { $regex: /^personal_task_/ } },
            { actionType: { $in: [
              'create_personal_task',
              'update_personal_task',
              'delete_personal_task',
              'complete_personal_task',
              'reopen_personal_task',
              'assign_personal_task',
              'unassign_personal_task',
              'archive_personal_task',
              'unarchive_personal_task'
            ]} }
          ]
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching personal task activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching personal task activity feed'
    });
  }
};

/**
 * Get activity feed for a specific user (admin only)
 * @route GET /api/activities/user/:userId
 * @access Private (Admin only)
 */
const getUserActivityFeedById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const options = {
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
      actionType: req.query.actionType,
      teamId: req.query.teamId,
      boardId: req.query.boardId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const activityFeed = await getUserActivityFeed(userId, options);
    
    res.status(200).json({
      success: true,
      data: activityFeed.activities,
      pagination: activityFeed.pagination
    });
  } catch (error) {
    console.error('Error fetching user activity feed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user activity feed'
    });
  }
};

module.exports = {
  getActivityFeed,
  getTeamActivityFeed,
  getBoardActivityFeed,
  getTaskActivityFeed,
  getPersonalTaskActivityFeed,
  getUserActivityFeedById  
};