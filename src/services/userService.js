const bcrypt = require('bcryptjs'); 
const User = require('../models/User');


class UserService {

  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(String(password), salt);
  }


  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(String(password), String(hash));
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }


  static async createUser(userData) {
    const { password, ...otherData } = userData;
    
    // Hash the password
    const hashedPassword = await this.hashPassword(password);
    
    return User.create({
      ...otherData,
      password: hashedPassword
    });
  }

  static async findUserByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  }


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