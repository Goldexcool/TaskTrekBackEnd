const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: [
      'create_board', 
      'update_board', 
      'delete_board',
      'create_column', 
      'update_column', 
      'delete_column',
      'create_task', 
      'update_task', 
      'delete_task',
      'move_task',
      'complete_task',
      'assign_task',
      'comment_task',
      'join_team',
      'leave_team',
      'invite_user',
      'add_member'
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

// Index for faster queries
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ team: 1, createdAt: -1 });
ActivitySchema.index({ board: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);