const User = require('../models/User');
const { logUserActivity } = require('../services/activityService');

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }
    
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).select('_id username email name avatar');
    
    const filteredUsers = users.filter(user => user._id.toString() !== req.user.id);
    
    res.status(200).json({
      success: true,
      count: filteredUsers.length,
      data: filteredUsers
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while searching for users'
    });
  }
};


const getProfile = async (req, res) => {
  try {
    console.log('Getting profile for user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving user profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log('Updating profile for user:', req.user.id);
    console.log('Update data:', req.body);
    
    const { 
      name, 
      username, 
      bio, 
      avatar,
      jobTitle,
      location,
      website,
      social
    } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (social !== undefined) updateData.social = social;
    
    updateData.updatedAt = Date.now();
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    try {
      await logUserActivity(
        'update_profile',
        req.user.id,
        `${updatedUser.name || updatedUser.username} updated their profile`,
        { updatedFields: Object.keys(updateData) }
      );
    } catch (activityError) {
      console.error('Failed to log profile update activity:', activityError);
    }
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user profile'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`Getting user with ID: ${userId}`);
    
    const user = await User.findById(userId).select('name username email avatar bio jobTitle location');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving user'
    });
  }
};

module.exports = {
  searchUsers,
  getProfile,
  updateProfile,
  getUserById
};