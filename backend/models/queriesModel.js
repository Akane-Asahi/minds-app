const mongoose = require('mongoose');

const queriesSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query:    { type: String, required: true, trim: true },
    searchTopic: { type: String, required: true, trim: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    os:       { type: String },
  },
  { timestamps: true }
);

// fast recent lookups per topic and workspace
queriesSchema.index({ userId: 1, searchTopic: 1, workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('Queries', queriesSchema);