const mongoose = require('mongoose');
const Team = require('../models/Team');
const Board = require('../models/Board');
const User = require('../models/User');
const { logTeamActivity } = require('../services/activityService');

const createTeam = async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a team name'
      });
    }
    
    // Create the team with the current user as owner and admin
    const team = await Team.create({
      name,
      description: description || '',
      owner: req.user.id,
      members: [{
        user: req.user.id,
        role: 'admin',
        joinedAt: Date.now()
      }],
      avatar: avatar || null
    });
    
    // Add this team to the user's teams array
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { teams: team._id } }
    );

    // Log activity
    await logTeamActivity(
      'create_team',
      req.user,
      team,
      null,
      `${req.user.username || 'A user'} created team "${name}"`,
      { teamName: name }
    );
    
    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while creating the team'
    });
  }
};

const getTeams = async (req, res) => {
  try {
    // Find teams where the user is a member
    const teams = await Team.find({
      members: { $elemMatch: { user: req.user.id } }
    }).populate('owner', 'username email');
    
    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching teams'
    });
  }
};

const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is a member of the team
    if (!team.members.some(member => member.user._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this team'
      });
    }
    
    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching the team'
    });
  }
};

/**
 * Update team
 * @route PUT /api/teams/:id
 */
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Find team
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user has permission to update the team
    if (team.owner.toString() !== req.user.id && 
        !team.admins.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this team'
      });
    }
    
    // Update team fields
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    
    // Save updated team
    await team.save();
    
    return res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    console.error('Update team error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is the owner of the team
    if (team.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this team'
      });
    }
    
    // Remove this team from all members' teams arrays
    await User.updateMany(
      { teams: team._id },
      { $pull: { teams: team._id } }
    );
    
    // Delete the team
    await team.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while deleting the team'
    });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the email of the user you want to add'
      });
    }
    
    // Find the team
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if the current user is an admin
    const currentMember = team.members.find(
      member => member.user.toString() === req.user.id
    );
    
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only team admins can add members'
      });
    }
    
    // Find the user to add by email
    const userToAdd = await User.findOne({ email });
    
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User with this email does not exist'
      });
    }
    
    // Check if user is already a member
    const isAlreadyMember = team.members.some(
      member => member.user.toString() === userToAdd._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }
    
    // Add user to team members
    team.members.push({
      user: userToAdd._id,
      role: 'member',
      joinedAt: Date.now()
    });
    
    await team.save();
    
    // Add team to user's teams
    userToAdd.teams = userToAdd.teams || [];
    if (!userToAdd.teams.includes(team._id)) {
      userToAdd.teams.push(team._id);
      await userToAdd.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: {
        teamId: team._id,
        newMember: {
          id: userToAdd._id,
          email: userToAdd.email,
          name: userToAdd.name || userToAdd.username,
          role: 'member'
        }
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while adding the member'
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    // Find the team
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if the current user is the team owner
    if (team.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the team owner can remove members'
      });
    }
    
    // Prevent removing the owner
    if (team.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the team owner'
      });
    }
    
    // Check if user is a member
    if (!team.members.some(member => member.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }
    
    // Remove user from team members
    team.members = team.members.filter(member => member.user.toString() !== userId);
    await team.save();
    
    // Remove team from user's teams
    await User.findByIdAndUpdate(userId, {
      $pull: { teams: team._id }
    });
    
    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while removing the member'
    });
  }
};

const changeRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid role (admin or member)'
      });
    }
    
    // Find the team
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if current user is an admin
    const currentUserMember = team.members.find(
      member => member.user.toString() === req.user.id
    );
    
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only team admins can change roles'
      });
    }
    
    // Find the target member
    const targetMemberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (targetMemberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }
    
    // If we're removing admin from ourselves, ensure there's at least one other admin
    if (userId === req.user.id && role === 'member') {
      const otherAdmins = team.members.filter(
        member => member.role === 'admin' && member.user.toString() !== req.user.id
      );
      
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change role: The team needs at least one admin'
        });
      }
    }
    
    // Update the role
    team.members[targetMemberIndex].role = role;
    await team.save();
    
    // If we're changing the owner role to member, update the owner field to a different admin
    if (team.owner.toString() === userId && role === 'member') {
      const newAdmin = team.members.find(
        member => member.role === 'admin' && member.user.toString() !== userId
      );
      
      if (newAdmin) {
        team.owner = newAdmin.user;
        await team.save();
      }
    }
    
    // If we're promoting a member to admin, consider making them the owner if there is no owner
    if (role === 'admin' && !team.owner) {
      team.owner = userId;
      await team.save();
    }
    
    res.status(200).json({
      success: true,
      message: `Role updated successfully to ${role}`,
      data: {
        teamId: team._id,
        userId,
        newRole: role,
        owner: team.owner
      }
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while changing the role'
    });
  }
};

const transferOwnership = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the user ID to transfer ownership to'
      });
    }
    
    // Find the team
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Verify current user is the owner
    if (team.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the team owner can transfer ownership'
      });
    }
    
    // Check if the target user is a member
    const targetMemberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (targetMemberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }
    
    // Make the target user an admin if they aren't already
    team.members[targetMemberIndex].role = 'admin';
    
    // Change the owner
    team.owner = userId;
    
    await team.save();
    
    res.status(200).json({
      success: true,
      message: 'Team ownership transferred successfully',
      data: {
        teamId: team._id,
        newOwner: userId
      }
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while transferring ownership'
    });
  }
};

const checkTeamExists = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Validate team ID format
    if (!teamId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: 'Invalid team ID format'
      });
    }
    
    // Check if team exists
    const team = await Team.findById(teamId).select('name avatar');
    
    if (!team) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: 'Team not found'
      });
    }
    
    // Team exists - return basic info
    return res.status(200).json({
      success: true,
      exists: true,
      team: {
        id: team._id,
        name: team.name,
        avatar: team.avatar
      }
    });
  } catch (error) {
    console.error('Check team exists error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while checking if team exists'
    });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the team and populate member information
    const team = await Team.findById(id)
      .populate({
        path: 'members.user',
        select: 'username email name avatar'
      });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if the current user is a member of this team
    const isMember = team.members.some(
      member => member.user._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }
    
    // Format the response
    const members = team.members.map(member => ({
      id: member.user._id,
      username: member.user.username,
      email: member.user.email,
      name: member.user.name,
      avatar: member.user.avatar,
      role: member.role,
      joinedAt: member.joinedAt,
      isOwner: team.owner.toString() === member.user._id.toString()
    }));
    
    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching team members'
    });
  }
};

// @desc    Search for teams
// @route   GET /api/teams/search
// @access  Private
const searchTeams = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }
    
    // Get user's teams first
    const user = await User.findById(req.user.id).populate('teams');
    const userTeamIds = user.teams.map(team => team._id);
    
    // Search for teams by name or description that user is a member of
    const teams = await Team.find({
      _id: { $in: userTeamIds },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).select('name description avatar owner members createdAt')
    .populate('owner', 'username email name avatar');
    
    // Format the response
    const formattedTeams = teams.map(team => ({
      id: team._id,
      name: team.name,
      description: team.description,
      avatar: team.avatar,
      owner: {
        id: team.owner._id,
        username: team.owner.username,
        name: team.owner.name || team.owner.username,
        avatar: team.owner.avatar
      },
      memberCount: team.members.length,
      createdAt: team.createdAt,
      isOwner: team.owner._id.toString() === req.user.id
    }));
    
    res.status(200).json({
      success: true,
      count: formattedTeams.length,
      data: formattedTeams
    });
  } catch (error) {
    console.error('Team search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while searching for teams'
    });
  }
};

const inviteUser = async (req, res) => {
  try {
    const { email, teamId } = req.body;
    
    // Find team and target user
    const team = await Team.findById(teamId);
    const targetUser = await User.findOne({ email });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Invite user logic...
    
    // Log activity
    await logTeamActivity(
      'invite_user',
      req.user,
      team,
      targetUser,
      `${req.user.username || 'A user'} invited ${targetUser.username || email} to team "${team.name}"`,
      { inviteeEmail: email, teamId }
    );
    
    res.status(200).json({
      success: true,
      message: 'User invited successfully'
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while inviting the user'
    });
  }
};

/**
 * Add members to a team
 * @route POST /api/teams/:id/members
 */
const addTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;

    // Validate input
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one member email or ID'
      });
    }

    // Find the team
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if current user has permission to add members
    if (team.owner.toString() !== req.user.id && 
        !team.admins.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add members to this team'
      });
    }

    // Process each member
    const results = {
      success: [],
      failed: []
    };

    for (const member of members) {
      // Find user by email or ID
      const query = mongoose.Types.ObjectId.isValid(member) 
        ? { _id: member } 
        : { email: member };
        
      const user = await User.findOne(query);

      if (!user) {
        results.failed.push({
          value: member,
          reason: 'User not found'
        });
        continue;
      }

      // Check if user is already a member
      if (team.members.includes(user._id)) {
        results.failed.push({
          value: member,
          userId: user._id,
          reason: 'User is already a member'
        });
        continue;
      }

      // Add user to team
      team.members.push(user._id);
      
      // Add team to user's teams if needed
      if (user.teams && !user.teams.includes(team._id)) {
        user.teams.push(team._id);
        await user.save();
      }

      results.success.push({
        userId: user._id,
        email: user.email,
        name: user.name || user.username
      });
    }

    // Save team if any members were added
    if (results.success.length > 0) {
      await team.save();
    }

    return res.status(200).json({
      success: true,
      message: `Added ${results.success.length} members to team`,
      results
    });
  } catch (error) {
    console.error('Error adding team members:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add members to a board
 * @route POST /api/boards/:boardId/members
 */
const addBoardMembers = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { members } = req.body;

    // Validate input
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one member email or ID'
      });
    }

    // Find the board
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check if current user has permission to add members
    if (board.owner.toString() !== req.user.id && 
        !board.members.some(m => m.userId.toString() === req.user.id && m.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add members to this board'
      });
    }

    // Process each member
    const results = {
      success: [],
      failed: []
    };

    for (const member of members) {
      // Find user by email or ID
      const query = mongoose.Types.ObjectId.isValid(member) 
        ? { _id: member } 
        : { email: member };
        
      const user = await User.findOne(query);

      if (!user) {
        results.failed.push({
          value: member,
          reason: 'User not found'
        });
        continue;
      }

      // Check if user is already a member
      if (board.members.some(m => m.userId.toString() === user._id.toString())) {
        results.failed.push({
          value: member,
          userId: user._id,
          reason: 'User is already a member'
        });
        continue;
      }

      // Add user to board with 'viewer' role by default
      board.members.push({
        userId: user._id,
        role: 'viewer'
      });

      results.success.push({
        userId: user._id,
        email: user.email,
        name: user.name || user.username,
        role: 'viewer'
      });
    }

    // Save board if any members were added
    if (results.success.length > 0) {
      await board.save();
    }

    return res.status(200).json({
      success: true,
      message: `Added ${results.success.length} members to board`,
      results
    });
  } catch (error) {
    console.error('Error adding board members:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  changeRole,
  transferOwnership,
  checkTeamExists,
  getTeamMembers,
  searchTeams,
  inviteUser,
  addTeamMembers,
  addBoardMembers
};