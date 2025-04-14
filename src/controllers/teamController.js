const Team = require('../models/Team');
const User = require('../models/User');

// Create a new team
const createTeam = async (req, res) => {
    try {
        const { name, description, members } = req.body;
        
        // Get user ID from the authenticated request
        const userId = req.user.id;
        
        // Format data for team creation
        const teamData = {
            name,
            description,
            owner: userId,
            // Add the creating user as an admin member
            members: [
                {
                    user: userId,
                    role: 'admin'
                }
            ]
        };
        
        // If additional members were provided, add them
        if (members && Array.isArray(members)) {
            members.forEach(member => {
                // Skip if member is already the owner
                if (member.user !== userId) {
                    teamData.members.push({
                        user: member.user,
                        role: member.role || 'member'
                    });
                }
            });
        }
        
        // Create the team
        const team = await Team.create(teamData);
        
        return res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: team
        });
    } catch (error) {
        console.error('Team creation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create team',
            error: error.message
        });
    }
};

// Get all teams for a user
const getTeams = async (req, res) => {
    try {
        // User ID from authentication token
        const userId = req.user.id;
        console.log('Fetching teams for user ID:', userId);
        
        // Find teams where user is a member or owner
        const teams = await Team.find({
            $or: [
                { owner: userId },
                { 'members.user': userId }
            ]
        }).populate('owner', 'username email');
        
        console.log('Found teams count:', teams.length);
        
        res.status(200).json({
            success: true,
            count: teams.length,
            data: teams
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve teams',
            error: error.message
        });
    }
};

// Get team by ID
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
        
        // Check if user is a member of this team
        // Use req.user.id consistently (not _id)
        const userId = req.user.id;
        
        const isMember = team.members.some(member => {
            // Handle both populated and non-populated cases
            const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
            return memberId === userId;
        });
        
        // Also check if user is the owner
        const isOwner = team.owner._id ? 
            team.owner._id.toString() === userId : 
            team.owner.toString() === userId;
        
        if (!isMember && !isOwner) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to access this team' 
            });
        }
        
        res.status(200).json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve team',
            error: error.message
        });
    }
};

// Update team
const updateTeam = async (req, res) => {
    try {
        const { name, description } = req.body;
        let team = await Team.findById(req.params.id);
        
        if (!team) {
            return res.status(404).json({ 
                success: false,
                message: 'Team not found' 
            });
        }
        
        // Get user ID consistently
        const userId = req.user.id;
        
        // Check if user is the team owner or an admin
        const member = team.members.find(member => {
            return member.user.toString() === userId;
        });
        
        const isOwner = team.owner.toString() === userId;
        
        if (!member || (member.role !== 'admin' && !isOwner)) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to update this team' 
            });
        }
        
        // Update team
        team = await Team.findByIdAndUpdate(
            req.params.id, 
            { name, description }, 
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
            message: 'Failed to update team',
            error: error.message
        });
    }
};

// Delete team
const deleteTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        
        if (!team) {
            return res.status(404).json({ 
                success: false,
                message: 'Team not found' 
            });
        }
        
        // Use req.user.id consistently
        const userId = req.user.id;
        
        // Only team owner can delete a team
        if (team.owner.toString() !== userId) {
            return res.status(403).json({ 
                success: false,
                message: 'Only the team owner can delete this team' 
            });
        }
        
        await Team.deleteOne({ _id: req.params.id });
        
        res.status(200).json({
            success: true,
            message: 'Team deleted successfully'
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete team',
            error: error.message
        });
    }
};

// Add member to team
const addMember = async (req, res) => {
    try {
        const { email, role } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required' 
            });
        }
        
        // Find team
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ 
                success: false,
                message: 'Team not found' 
            });
        }
        
        // Check if user is an admin of this team
        const currentMember = team.members.find(
            member => member.user.toString() === req.user._id.toString()
        );
        
        if (!currentMember || (currentMember.role !== 'admin' && team.owner.toString() !== req.user._id.toString())) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to add members to this team' 
            });
        }
        
        // Find user to add
        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
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
        
        // Add user to team
        team.members.push({
            user: userToAdd._id,
            role: role || 'member'
        });
        
        await team.save();
        
        res.status(200).json({
            success: true,
            message: 'Member added successfully',
            data: team
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to add member',
            error: error.message
        });
    }
};

// Remove member from team
const removeMember = async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        // Find team
        const team = await Team.findById(id);
        if (!team) {
            return res.status(404).json({ 
                success: false,
                message: 'Team not found' 
            });
        }
        
        // Check if user is an admin of this team
        const currentMember = team.members.find(
            member => member.user.toString() === req.user._id.toString()
        );
        
        if (!currentMember || (currentMember.role !== 'admin' && team.owner.toString() !== req.user._id.toString())) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to remove members from this team' 
            });
        }
        
        // Cannot remove the owner
        if (team.owner.toString() === userId) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot remove the team owner' 
            });
        }
        
        // Remove user from team
        team.members = team.members.filter(
            member => member.user.toString() !== userId
        );
        
        await team.save();
        
        res.status(200).json({
            success: true,
            message: 'Member removed successfully',
            data: team
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to remove member',
            error: error.message
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