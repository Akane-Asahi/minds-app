const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { toObjectId } = require('../utils/id');
const Workspace = require('../models/workspaceModel');
const SavedDoc = require('../models/savedDocModel');
const Query = require('../models/queriesModel');

const verifyWorkspaceOwnership = async (workspaceId, userId) => {
  const workspaceObjectId = toObjectId(workspaceId);
  const userIdObjectId = toObjectId(userId);
  if (!workspaceObjectId || !userIdObjectId) return null;
  return Workspace.findOne({ _id: workspaceObjectId, userId: userIdObjectId });
};

/** Resource/query counts for a single workspace. Workspace is metadata only; counts are computed. */
const getWorkspaceCounts = async (userIdObjectId, workspaceObjectId) => {
  const [queryCounts, savedDocCounts] = await Promise.all([
    Query.aggregate([
      { $match: { userId: userIdObjectId, workspaceId: workspaceObjectId } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ]),
    SavedDoc.aggregate([
      { $match: { userId: userIdObjectId, workspaceId: workspaceObjectId, isRemoved: false } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ])
  ]);
  return {
    resourceCount: savedDocCounts[0]?.count ?? 0,
    queryCount: queryCounts[0]?.count ?? 0,
  };
};

/**
 * Create a new workspace
 * userId from req.user.id only; never from req.body/req.query.
 * @route   POST /api/workspaces
 * @access  Private
 */
const createWorkspace = asyncHandler(async (req, res) => {
  const title = (req.body.ws_title || req.body.title || req.body.name || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Workspace title (title, ws_title, or name) is required' });
  }

  const userIdObjectId = toObjectId(req.user?.id);
  if (!userIdObjectId) return res.status(401).json({ error: 'Not authorized', code: 'UNAUTHORIZED' });

  const createPayload = { userId: userIdObjectId, title };
  if (req.body.color != null && String(req.body.color).trim()) {
    createPayload.color = String(req.body.color).trim();
  }

  try {
    const workspace = await Workspace.create(createPayload);
    const doc = workspace.toObject ? workspace.toObject() : workspace;
    return res.status(201).json({
      _id: doc._id,
      userId: doc.userId,
      title: doc.title,
      color: doc.color,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      resourceCount: 0,
      queryCount: 0
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (unique constraint violation)
      return res.status(400).json({ 
        error: 'A workspace with this title already exists' 
      });
    }
    throw error;
  }
});

/**
 * Get all workspaces for authenticated user
 * Only returns workspaces owned by req.user.id. Never uses userId from body/query.
 * @route   GET /api/workspaces
 * @access  Private
 */
const fetchAllWorkspaces = asyncHandler(async (req, res) => {
  const userIdObjectId = toObjectId(req.user?.id);
  if (!userIdObjectId) return res.status(401).json({ error: 'Not authorized', code: 'UNAUTHORIZED' });

  const allWorkspaces = await Workspace.find({ userId: userIdObjectId })
    .sort({ updatedAt: -1 })
    .lean();

  if (!allWorkspaces.length) {
    return res.status(200).json([]);
  }

  const workspaceIds = allWorkspaces.map(ws => ws._id);

  // Workspace is metadata only; counts are computed from SavedDoc and Queries (not stored).
  const [queryCounts, savedDocCounts] = await Promise.all([
    Query.aggregate([
            {
              $match: {
          userId: userIdObjectId,
          workspaceId: { $in: workspaceIds }
        }
      },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ]),
    SavedDoc.aggregate([
            {
              $match: {
          userId: userIdObjectId,
          workspaceId: { $in: workspaceIds },
          isRemoved: false
        }
      },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ])
    ]);

  // Create count maps
    const queryCountMap = new Map(
    queryCounts.map(item => [String(item._id), item.count])
    );
    const savedDocCountMap = new Map(
    savedDocCounts.map(item => [String(item._id), item.count])
    );
  // Counts are computed fields; Workspace DB remains metadata-only.
  const workspacesWithCounts = allWorkspaces.map(workspace => ({
    ...workspace,
    _id: workspace._id,
    title: workspace.title,
    ws_id: workspace._id,
    ws_title: workspace.title,
    resourceCount: savedDocCountMap.get(String(workspace._id)) ?? 0,
    queryCount: queryCountMap.get(String(workspace._id)) ?? 0
  }));

  // Guarantee no legacy alias fields or __v in response (plain objects only)
  const out = workspacesWithCounts.map((item) => {
    const plain = {
      _id: item._id,
      userId: item.userId,
      title: item.title,
      color: item.color,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      resourceCount: item.resourceCount,
      queryCount: item.queryCount
    };
    delete plain.ws_id;
    delete plain.ws_title;
    return plain;
  });

  return res.status(200).json(out);
});

/**
 * Get a single workspace by ID
 * Only returns workspace if owned by req.user.id. Never uses userId from body/query.
 * @route   GET /api/workspaces/:workspaceId
 * @access  Private
 */
const fetchWorkspaceById = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userIdObjectId = toObjectId(req.user?.id);
  if (!userIdObjectId) return res.status(401).json({ error: 'Not authorized', code: 'UNAUTHORIZED' });

  const workspaceObjectId = toObjectId(workspaceId);
  if (!workspaceObjectId) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  const workspace = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: userIdObjectId
  });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  const { resourceCount, queryCount } = await getWorkspaceCounts(userIdObjectId, workspaceObjectId);

  const ws = workspace.toObject ? workspace.toObject() : workspace;
  return res.status(200).json({
    _id: ws._id,
    userId: ws.userId,
    title: ws.title,
    color: ws.color,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    resourceCount,
    queryCount
  });
});

/**
 * Update a workspace
 * Only updates if owned by req.user.id. Never uses userId from body/query.
 * @route   PUT /api/workspaces/:workspaceId
 * @access  Private
 */
const updateWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, color } = req.body;
  const userIdObjectId = toObjectId(req.user?.id);
  if (!userIdObjectId) return res.status(401).json({ error: 'Not authorized', code: 'UNAUTHORIZED' });

  const workspaceObjectId = toObjectId(workspaceId);
  if (!workspaceObjectId) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (color !== undefined) updateData.color = color;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No update data provided' });
  }

  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceObjectId, userId: userIdObjectId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });
  }

  const { resourceCount, queryCount } = await getWorkspaceCounts(userIdObjectId, workspaceObjectId);

  const doc = workspace.toObject ? workspace.toObject() : workspace;
  return res.status(200).json({
    _id: doc._id,
    userId: doc.userId,
    title: doc.title,
    color: doc.color,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    resourceCount,
    queryCount
  });
});

/**
 * Delete a workspace
 * Only deletes if owned by req.user.id. Never uses userId from body/query.
 * @route   DELETE /api/workspaces/:workspaceId
 * @access  Private
 */
const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userIdObjectId = toObjectId(req.user?.id);
  if (!userIdObjectId) return res.status(401).json({ error: 'Not authorized', code: 'UNAUTHORIZED' });

  const workspaceObjectId = toObjectId(workspaceId);
  if (!workspaceObjectId) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  const workspace = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: userIdObjectId
  });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  await Promise.all([
    SavedDoc.deleteMany({ userId: userIdObjectId, workspaceId: workspaceObjectId }),
    Query.deleteMany({ userId: userIdObjectId, workspaceId: workspaceObjectId }),
    Workspace.deleteOne({ _id: workspaceObjectId, userId: userIdObjectId }),
  ]);

    return res.status(200).json({
    success: true, 
    message: 'Workspace deleted successfully' 
  });
});

module.exports = {
  createWorkspace,
  fetchAllWorkspaces,
  fetchWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  verifyWorkspaceOwnership
};
