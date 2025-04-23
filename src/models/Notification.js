const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Who should receive this notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What type of notification is this
  type: {
    type: String,
    enum: [
      'team_invitation', 
      'team_invitation_accepted', 
      'task_assigned',
      'task_completed',
      'task_reopened',
      'task_comment',
      'board_created',
      'board_shared',
      'task_due_soon',
      'mention'
    ],
    required: true
  },
  
  // Human-readable message
  message: {
    type: String,
    required: true
  },
  
  // Has the user seen this notification?
  read: {
    type: Boolean,
    default: false
  },
  
  // Related entities for navigation when clicked
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedBoard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  },
  relatedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  
  // Who triggered this notification
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // When this notification was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);