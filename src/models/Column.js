const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  title: { 
    type: String,
    required: [true, 'Please provide a column title'],
    trim: true
  },
  board: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Column must be associated with a board']
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Column', ColumnSchema);