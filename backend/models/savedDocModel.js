const mongoose = require('mongoose');

/**
 * SavedDoc Schema - Saved search result documents
 * 
 * Each saved doc MUST be associated with the query that produced it.
 * 
 * Fields:
 * - userId: Owner user ID (from JWT, required)
 * - workspaceId: Workspace ID (required)
 * - externalId: Canonical doc id (required)
 * - title: Document title (for quick access)
 * - queryText: Query string that produced this doc (REQUIRED)
 * - queryId: Related query ID (optional)
 * - firstSavedQueryId/firstSavedQueryText: When doc is reused (no duplicate), original query
 * - lastSeenQueryId/lastSeenQueryText: Most recent query context when doc was updated
 * - docdata: Full document metadata (Mixed, required). Should include pnx (Primo PNX),
 *   displayLabel, iconType for consistent classification in mini timeline / saved results.
 * - doc_type: Primo pnx.display.type[0] at save time — source of truth for saved views.
 * - iconType: Optional; SERP icon type at save time for consistent icon in saved views.
 * - isRemoved: Soft delete flag (default: false)
 * - timestamps: createdAt, updatedAt
 */
const savedDocSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  externalId: {
    type: String,
    required: [true, 'External ID is required'],
    trim: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  queryText: {
    type: String,
    required: [true, 'queryText is required - the query that produced this document'],
    trim: true
  },
  docdata: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  doc_type: {
    type: String,
    trim: true,
    default: ''
  },
  iconType: {
    type: String,
    trim: true
  },
  searchTopic: {
    type: String,
    trim: true
  },
  queryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queries'
  },
  firstSavedQueryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queries'
  },
  firstSavedQueryText: {
    type: String,
    trim: true
  },
  lastSeenQueryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queries'
  },
  lastSeenQueryText: {
    type: String,
    trim: true
  },
  isRemoved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'saved_docs'  // Canonical. Legacy saveddocs is archive-only, not used at runtime.
});

// Indexes
savedDocSchema.index({ userId: 1, workspaceId: 1, createdAt: -1 });
savedDocSchema.index({ userId: 1, isRemoved: 1, createdAt: -1 });
// Unique constraint: one active document per user/workspace/externalId
savedDocSchema.index(
  { userId: 1, workspaceId: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { isRemoved: false } }
);

module.exports = mongoose.model('SavedDoc', savedDocSchema);

