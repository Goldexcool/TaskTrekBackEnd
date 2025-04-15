const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const UserSchema = new mongoose.Schema(
  {
    // Support both name and username fields
    name: { 
      type: String,
      required: [true, 'Please add a name'] 
    },
    username: {
      type: String,
      required: [true, 'Please provide a username'], 
      unique: true,
      sparse: true, 
      trim: true
    },
    email: { 
      type: String, 
      required: [true, 'Please provide an email'], 
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    password: { 
      type: String, 
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
      set: function(password) {
        // Don't transform hashed passwords - only hash plain passwords
        if (password.startsWith('$2b$') || password.startsWith('$2a$')) {
          return password;
        }
        return password; // Return as-is, we'll hash separately
      }
    },
    // Verification fields
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: {
      type: String
    },
    verificationExpires: {
      type: Date
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Refresh token for authentication
    refreshToken: {
      type: String,
      default: null,
      select: false
    }
  },
  { timestamps: true }
);

// Remove sensitive data from JSON responses
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.verificationCode;
  delete user.resetPasswordToken;
  return user;
};


UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create or retrieve the model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;