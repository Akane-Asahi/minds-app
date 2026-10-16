const mongoose = require('mongoose');

/**
 * User Schema - Represents a Participant.
 * - username: Internal unique ID (e.g. "p_1") for safe lookup; prefixed to avoid collisions.
 * - participantId: Display value (e.g. "1") shown to UI; what the participant typed.
 */
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [1, 'Username must be at least 1 character']
  },
  participantId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
