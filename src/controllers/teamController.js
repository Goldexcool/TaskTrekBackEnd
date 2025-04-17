const Team = require('../models/Team');
const User = require('../models/User');

const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a team name'
      });
    }
    
    // Create the team with the current user as owner and member
    const team = await Team.create({
      name,
      description: description || '',
      owner: req.user.id,
      members: [req.user.id]
    });
    
    // Add this team to the user's teams array
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { teams: team._id } }
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
      members: req.user.id
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
      .populate('members', 'username email');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is a member of the team
    if (!team.members.some(member => member._id.toString() === req.user.id)) {
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

const updateTeam = async (req, res) => {
  try {
    let team = await Team.findById(req.params.id);
    
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
        message: 'You are not authorized to update this team'
      });
    }
    
    team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while updating the team'
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

// @desc    Add a member to a team
// @route   POST /api/teams/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { id } = req.params; // Team ID
    const { email } = req.body; // Email of the user to add
    
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
    
    // Check if the current user is the team owner
    if (team.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the team owner can add members'
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
    if (team.members.includes(userToAdd._id)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }
    
    // Add user to team members
    team.members.push(userToAdd._id);
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
          name: userToAdd.name || userToAdd.username
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

// @desc    Remove a member from a team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private
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
    if (!team.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }
    
    // Remove user from team members
    team.members = team.members.filter(member => member.toString() !== userId);
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

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember
};