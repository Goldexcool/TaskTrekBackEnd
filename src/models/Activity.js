const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: [
      // Board actions
      'create_board', 'update_board', 'delete_board',
      
      // Column actions
      'create_column', 'update_column', 'delete_column', 'reorder_column',
      
      // Task actions
      'create_task', 'update_task', 'delete_task', 'move_task',
      'complete_task', 'reopen_task', 'assign_task', 'comment_task',
      
      // Team actions
      'create_team', 'update_team', 'delete_team',
      'join_team', 'leave_team', 'invite_user', 'add_member', 'remove_member',
      
      // User actions
      'user_login', 'user_signup', 'update_profile'
    ],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  },
  column: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column'
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ team: 1, createdAt: -1 });
ActivitySchema.index({ board: 1, createdAt: -1 });
ActivitySchema.index({ task: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);