const bcrypt = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const User = require('../models/User');

/**
 * User service for consistent password handling and user operations
 */

class UserService {

  static async hashPassword(password) {
    // Use a higher cost factor for better security
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(String(password), salt);
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches hash
   */
  static async verifyPassword(password, hash) {
    try {
      // Ensure both are strings
      return await bcrypt.compare(String(password), String(hash));
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  static async createUser(userData) {
    const { password, ...otherData } = userData;
    
    // Hash the password
    const hashedPassword = await this.hashPassword(password);
    
    // Create the user with hashed password
    return User.create({
      ...otherData,
      password: hashedPassword
    });
  }

  /**
   * Find user by email with password
   * @param {string} email - User email
   * @returns {Promise<Object>} - User object
   */
  static async findUserByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Updated user
   */
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await this.hashPassword(newPassword);
    
    return User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );
  }
}

module.exports = UserService;