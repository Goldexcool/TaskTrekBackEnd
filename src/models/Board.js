const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a board name'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    team: {  // This field name must match what you provide in the request
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: [true, 'Board must be associated with a team']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Board must have a creator']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Board', BoardSchema);