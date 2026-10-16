const mongoose = require('mongoose');

/**
 * Workspace Schema - User workspaces for organizing search results
 *
 * Workspace is metadata only; counts are computed from SavedDoc and Queries at runtime.
 * Do NOT define or persist: resourceCount, queryCount, notes, searchTerms.
 *
 * Fields:
 * - userId: Owner user ID (ObjectId ref User, required, indexed)
 * - title: Workspace title (required)
 * - color: Workspace color theme (optional, default)
 * - timestamps: createdAt, updatedAt
 */
const workspaceSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Workspace title is required'],
    trim: true,
    maxlength: [200, 'Workspace title cannot exceed 200 characters']
  },
  color: {
    type: String,
    default: '#f6f8fb'
  }
}, {
  timestamps: true
});

// Indexes
workspaceSchema.index({ userId: 1, updatedAt: -1 });
workspaceSchema.index({ userId: 1, title: 1 }, { unique: true }); // Unique workspace title per user

module.exports = mongoose.model('Workspace', workspaceSchema);
