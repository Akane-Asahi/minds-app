const crypto = require('crypto');
const { toObjectId } = require('../utils/id');
const { debugLog } = require('../utils/logger');
const SavedDoc = require('../models/savedDocModel');  // Canonical: collection saved_docs
const Queries   = require('../models/queriesModel');
const { normalizeDocumentArray } = require('../utils/metadataNormalizer');

const toId = toObjectId;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
/** Deterministic fallback when externalId/ControlNumber missing. Never use null/""/undefined. */
function generateFallbackExternalId(docdata) {
  const d = docdata || {};
  const title = d.Title || d.title || '';
  const author = (Array.isArray(d.Author) ? d.Author.join(';') : d.Author) || '';
  const year = d.PublicationDate || d.Year || d.year || '';
  const recordId = d.pnx?.control?.recordid?.[0] || '';
  const str = [title, author, year, recordId].filter(Boolean).join('|') || 'unknown';
  const hash = crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
  return 'gen:' + hash;
}
const buildWorkspaceObjectId = (value) => {
  const id = toId(value);
  return id || null;
};

/**
 * Queries.searchTopic and SavedDoc.searchTopic store the workspace title (contextual topic).
 * Falls back to fallbackText only if the workspace has no title string.
 */
async function resolveWorkspaceTopicForStorage(workspaceObjectId, uid, fallbackText = '') {
  const Workspace = require('../models/workspaceModel');
  const ws = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: toId(uid),
  })
    .select('title')
    .lean();
  if (!ws) return null;
  const t = normalizeString(ws.title);
  if (t) return t;
  const fb = normalizeString(fallbackText);
  return fb || 'default';
}

/**
 * Helper: Map SavedDoc to frontend-compatible format
 * Includes both externalId and ControlNumber for backward compatibility
 */
const mapSavedDocToResponse = (savedDoc) => {
  if (!savedDoc) return null;

  const doc = savedDoc.toObject ? savedDoc.toObject() : savedDoc;
  // workspaceId as string for frontend comparisons (ObjectId serializes to string in JSON; explicit for consistency)
  const wsId = doc.workspaceId != null ? String(doc.workspaceId) : doc.workspaceId;

  // docdata returned as-is (includes pnx, displayLabel, iconType when present); no projection/strip.
  return {
    _id: doc._id,
    ControlNumber: doc.externalId,
    externalId: doc.externalId,
    docdata: doc.docdata,
    doc_type: doc.doc_type ?? doc.docdata?.doc_type ?? '',
    iconType: doc.iconType ?? doc.docdata?.iconType ?? null,
    title: doc.title,
    queryText: doc.queryText || doc.searchTopic,
    searchTopic: doc.searchTopic || doc.queryText,
    workspaceId: wsId,
    queryId: doc.queryId,
    firstSavedQueryId: doc.firstSavedQueryId,
    lastSeenQueryId: doc.lastSeenQueryId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

// ---- helpers ---------------------------------------------------------------

/**
 * Most recently issued Queries row for this workspace (by createdAt).
 * Used when saving without a client-provided queryId — parent = latest search, not text-matched dedupe.
 */
async function getLatestQueryForWorkspace({ userId, workspaceId }) {
  const uid = toId(userId);
  const workspaceObjectId = buildWorkspaceObjectId(workspaceId);
  if (!uid || !workspaceObjectId) return null;
  return Queries.findOne({
    userId: uid,
    workspaceId: workspaceObjectId,
  })
    .sort({ createdAt: -1 })
    .select('_id')
    .lean();
}

/**
 * Idempotent save: ensure a SavedDoc exists for the user in the workspace.
 * Writes ONLY to saved_docs. Uniqueness: { userId, workspaceId, externalId, isRemoved:false }.
 *
 * @param {Object} params
 * @param {ObjectId} params.userId - From req.user.id
 * @param {ObjectId} params.workspaceId - Must belong to user
 * @param {string} params.externalId - Canonical doc id (ControlNumber)
 * @param {string} params.queryText - Query that produced this doc
 * @param {Object} params.docdata - Document metadata
 * @param {ObjectId} [params.queryId] - Optional related query
 * @param {string} [params.searchTopic] - Used only to derive finalQueryText when queryText empty; stored searchTopic is always workspace.title
 * @param {string} [params.title] - Optional document title
 * @param {string} [params.doc_type] - Primo pnx.display.type[0], source of truth for saved views
 * @param {string} [params.iconType] - SERP icon type at save time
 * @returns {Promise<{ doc: SavedDoc, created: boolean, migrated: boolean }>} migrated always false (no legacy read)
 */
async function ensureSavedDocForUser({
  userId,
  workspaceId,
  externalId,
  queryText,
  docdata,
  queryId = null,
  searchTopic = null,
  title = '',
  doc_type = '',
  iconType = null,
}) {
  const uid = toId(userId);
  const workspaceObjectId = buildWorkspaceObjectId(workspaceId);
  const normalizedExternalId = String(externalId || '').trim();
  const finalTitle = title || docdata?.Title || docdata?.title || '';
  const finalDocType = doc_type !== undefined ? String(doc_type || '').trim() : undefined;
  const finalIconType = iconType !== undefined ? (iconType != null ? String(iconType).trim() : null) : undefined;

  if (!uid || !workspaceObjectId || !normalizedExternalId || !docdata) {
    throw new Error('ensureSavedDocForUser: userId, workspaceId, externalId, docdata required');
  }

  // a) Validate workspace ownership
  const Workspace = require('../models/workspaceModel');
  const workspace = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: uid,
  });
  if (!workspace) {
    throw new Error('Workspace not found or access denied');
  }

  const finalQueryText = (queryText || searchTopic || 'Manual Tagging').trim() || 'Manual Tagging';
  const contextualTopic =
    normalizeString(workspace.title) || normalizeString(finalQueryText) || 'Manual Tagging';
  const finalSearchTopic = contextualTopic;

  // b) Try find existing SavedDoc
  // Uniqueness by document identity: userId+workspaceId+externalId (NOT queryId/searchTopic)
  const existingFilter = {
    userId: uid,
    workspaceId: workspaceObjectId,
    externalId: normalizedExternalId,
    isRemoved: false,
  };
  debugLog('[SavedDoc WRITE]', { userId, workspaceId: workspaceObjectId, externalId: normalizedExternalId });
  let existing = await SavedDoc.findOne(existingFilter).lean();
  if (existing) {
    // Update lastSeenQuery and docdata
    const updated = await SavedDoc.findOneAndUpdate(
      existingFilter,
      {
        $set: {
          docdata,
          queryText: finalQueryText,
          title: finalTitle,
          searchTopic: finalSearchTopic,
          queryId: queryId || null,
          lastSeenQueryId: queryId || null,
          lastSeenQueryText: finalQueryText,
          isRemoved: false,
          ...(finalDocType !== undefined && { doc_type: finalDocType }),
          ...(finalIconType !== undefined && { iconType: finalIconType }),
        },
      },
      { new: true }
    );
    return { doc: updated, created: false, migrated: false };
  }
  // c) Create new SavedDoc (writes ONLY to saved_docs)
  try {
    const newDoc = await SavedDoc.create({
      userId: uid,
      workspaceId: workspaceObjectId,
      externalId: normalizedExternalId,
      queryText: finalQueryText,
      title: finalTitle,
      docdata,
      doc_type: finalDocType ?? '',
      iconType: finalIconType ?? null,
      searchTopic: finalSearchTopic,
      queryId: queryId || null,
      firstSavedQueryId: queryId || null,
      firstSavedQueryText: finalQueryText,
      lastSeenQueryId: queryId || null,
      lastSeenQueryText: finalQueryText,
      isRemoved: false,
    });
    return { doc: newDoc, created: true, migrated: false };
  } catch (createErr) {
    if (createErr.code === 11000) {
      const raced = await SavedDoc.findOne(existingFilter);
      if (raced) return { doc: raced, created: false, migrated: false };
    }
    throw createErr;
  }
}

// ---- toggle save/unsave (used by UI) --------------------------------------

/**
 * POST /api/saveddocs/add
 * Upsert a doc; accepts optional { query } and will attach queryId.
 */
const addSavedDoc = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { ControlNumber, externalId, docdata, docData, doc_type: bodyDocType, iconType: bodyIconType, searchTopic, query, queryText, queryId: providedQueryId, os, workspaceId } = req.body || {};
  const userId = req.user.id; // From JWT middleware - NEVER accept from client
  const uid = toId(userId);
  const docdataResolved = docdata || docData;
  const doc_typeFromBody = bodyDocType ?? docdataResolved?.pnx?.display?.type?.[0] ?? docdataResolved?.Type ?? '';
  const iconTypeFromBody = bodyIconType ?? docdataResolved?.iconType ?? null;
  let normalizedControl = (ControlNumber || externalId) ? String(ControlNumber || externalId).trim() : '';
  if (!normalizedControl && docdataResolved) normalizedControl = generateFallbackExternalId(docdataResolved);
  const normalizedTopic = normalizeString(searchTopic);
  const normalizedQuery = normalizeString(query || queryText);
  const workspaceObjectId = buildWorkspaceObjectId(workspaceId);

  debugLog('[POST /saveddocs/add]', { externalId: normalizedControl, workspaceId: workspaceObjectId });

  // Validation: require ControlNumber/externalId, docdata, workspaceId, and queryText
  if (!uid) {
    return res.status(401).json({ error: 'User ID is required (from JWT token)' });
  }
  if (!normalizedControl) {
    return res.status(400).json({ error: 'ControlNumber or externalId is required' });
  }
  if (!docdataResolved) {
    return res.status(400).json({ error: 'docdata (or docData) is required' });
  }
  if (!workspaceObjectId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }

  // queryText: required for schema; default to "Manual Tagging" if missing (backward compat)
  const finalQueryText = (normalizedQuery || normalizedTopic || 'Manual Tagging').trim() || 'Manual Tagging';

  // Prefer client queryId (current SERP search); else latest issued query in workspace; else create one
  let queryId = providedQueryId ? toId(providedQueryId) : null;
  if (queryId) {
    const existingQuery = await Queries.findOne({ _id: queryId, userId: uid });
    if (!existingQuery) {
      queryId = null;
    }
  }
  if (!queryId && workspaceObjectId) {
    const latest = await getLatestQueryForWorkspace({ userId: uid, workspaceId: workspaceObjectId });
    queryId = latest?._id ? toId(latest._id) : null;
  }
  if (!queryId && finalQueryText && workspaceObjectId) {
    const topicForQueries = await resolveWorkspaceTopicForStorage(workspaceObjectId, uid, finalQueryText);
    if (topicForQueries == null) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }
    const q = await Queries.create({
      userId: uid,
      searchTopic: topicForQueries,
      query: normalizeString(normalizedQuery || finalQueryText),
      os: os || 'web',
      workspaceId: workspaceObjectId,
    });
    queryId = q._id;
  }

  const existingFilter = {
    userId: uid,
    workspaceId: workspaceObjectId,
    externalId: normalizedControl,
    isRemoved: false,
  };

  try {
    const { doc, created, migrated } = await ensureSavedDocForUser({
      userId: uid,
      workspaceId: workspaceObjectId,
      externalId: normalizedControl,
      queryText: finalQueryText,
      docdata: docdataResolved,
      queryId,
      searchTopic: normalizedTopic,
      title: docdataResolved?.Title || docdataResolved?.title || '',
      doc_type: doc_typeFromBody,
      iconType: iconTypeFromBody,
    });

    debugLog('[POST /saveddocs/add] SUCCESS', doc._id, created);

    res.json({
      _id: doc._id,
      savedDocId: doc._id,
      externalId: normalizedControl,
      workspaceId: String(workspaceObjectId),
      queryId: queryId ? String(queryId) : null,
      created,
      migrated,
    });
  } catch (error) {
    if (error.message === 'Workspace not found or access denied') {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: `Validation error: ${messages}` });
    }
    if (error.code === 11000) {
      const keyPattern = error.keyPattern;
      const keyValue = error.keyValue;
      debugLog('[POST /saveddocs/add] E11000 duplicate key', { keyPattern, keyValue });

      const existing = await SavedDoc.findOne(existingFilter);
      if (existing) {
        return res.json({
          _id: existing._id,
          savedDocId: existing._id,
          externalId: normalizedControl,
          workspaceId: String(workspaceObjectId),
          queryId: queryId ? String(queryId) : null,
          created: false,
          migrated: false,
        });
      }

      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          error: 'Duplicate key',
          keyPattern,
          keyValue,
          message: 'E11000 likely from a query-based unique index. Run: npm run audit-saved-indexes',
        });
      }
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
};

/** POST /api/saveddocs/remove -> soft delete by savedocId */
const removeSavedDoc = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { savedocId } = req.body || {};
  const id = toId(savedocId);
  const userId = req.user.id; // From JWT middleware
  const uid = toId(userId);

  if (!id) return res.status(400).json({ error: 'savedocId is required' });

  // Soft-delete only active saves; removed docs are not returned by list APIs
  const updated = await SavedDoc.findOneAndUpdate(
    { _id: id, userId: uid, isRemoved: false },
    { $set: { isRemoved: true } },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ error: 'SavedDoc not found' });
  }
  res.json({ ok: true, _id: updated._id });
};

/**
 * GET /api/saveddocs/byExternalId/:externalId?workspaceId=...
 * Returns savedDoc { _id } if active. Uses canonical externalId (Primo id).
 * Query: { userId: req.user.id, workspaceId, externalId }
 */
const getSavedDocByExternalId = async (req, res) => {
  const userId = req.user.id; // From JWT middleware
  const uid = toId(userId);
  const externalId = String(req.params.externalId || '').trim();
  const workspaceId = req.query.workspaceId;

  if (!uid || !externalId) {
    return res.status(400).json({ error: 'userId and externalId are required' });
  }

  const workspaceObjectId = buildWorkspaceObjectId(workspaceId);
  if (!workspaceObjectId) {
    return res.status(400).json({ error: 'workspaceId query param is required' });
  }

  // Verify workspace ownership
  const Workspace = require('../models/workspaceModel');
  const workspace = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: uid
  });
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or access denied' });
  }

  const filter = {
    userId: uid,
    workspaceId: workspaceObjectId,
    externalId,
    isRemoved: false
  };

  const doc = await SavedDoc.findOne(filter).select('_id docdata externalId workspaceId');
  if (!doc) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    _id: doc._id,
    savedDocId: doc._id,
    externalId: doc.externalId,
    workspaceId: doc.workspaceId != null ? String(doc.workspaceId) : null,
  });
};

/**
 * POST /api/saveddocs/saveQueryOnSearch
 * Create a new Query row for each search execution (distinct ids even for identical query text).
 * - query = user's search string (for the first run after workspace creation, same as workspace title)
 * - searchTopic = workspace title (contextual topic for all queries in that workspace)
 * Returns queryId for use in subsequent save operations.
 */
const saveQueryOnSearch = async (req, res) => {
  const userId = req.user.id;
  const uid = toId(userId);
  const queryText = normalizeString(req.body.query || req.body.queryText);
  const os = req.body.os || 'web';
  const workspaceId = req.body.workspaceId;
  const workspaceObjectId = buildWorkspaceObjectId(workspaceId);

  if (!uid || !queryText) {
    return res.status(400).json({ error: 'query or queryText is required' });
  }

  if (!workspaceObjectId) {
    return res.status(400).json({ error: 'workspaceId is required' });
  }

  // Verify workspace ownership
  const Workspace = require('../models/workspaceModel');
  const workspace = await Workspace.findOne({
    _id: workspaceObjectId,
    userId: uid
  });

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or access denied' });
  }

  const topicForQueries =
    normalizeString(workspace.title) || normalizeString(queryText) || 'default';

  // Always create a new query record so every search execution is logged
  const q = await Queries.create({
    userId: uid,
    searchTopic: topicForQueries,
    query: normalizeString(queryText),
    os,
    workspaceId: workspaceObjectId,
  });

  if (!q || !q._id) {
    return res.status(500).json({ error: 'Failed to create query' });
  }

  debugLog('[POST /saveddocs/saveQueryOnSearch]', { queryId: q._id });
  return res.json({ ok: true, queryId: q._id, queryText: queryText });
};

/**
 * POST /api/saveddocs/querylist
 * Return queries for a topic, each with its saved documents (linked via queryId).
 * Uses one batch SavedDoc find (no N+1 per query).
 * body: { userId, searchTopic, workspaceId }
 * resp: { list: [ { _id, query, createdAt, documents: [ ...doc ] } ] }
 */
const getQueryList = async (req, res) => {
  const userId = req.user.id; // From JWT middleware - NEVER accept from client
  const uid = toId(userId);
  const searchTopicInput = normalizeString(req.body.searchTopic);
  const workspaceId = req.body.workspaceId;
  const wsObjectId = toObjectId(workspaceId);

  if (!wsObjectId) {
    return res.status(400).json({ error: 'workspaceId is required', code: 'WORKSPACE_ID_REQUIRED', list: [] });
  }
  if (!uid) {
    return res.status(400).json({ error: 'Invalid user', code: 'BAD_REQUEST', list: [] });
  }

  const Workspace = require('../models/workspaceModel');
  const workspace = await Workspace.findOne({
    _id: wsObjectId,
    userId: uid
  });

  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND', list: [] });
  }

  // Baseline: only active saves — soft-removed docs must not appear in lists
  const baseDocFilter = {
    userId: uid,
    workspaceId: wsObjectId,
    isRemoved: false,
    ...(searchTopicInput && { searchTopic: searchTopicInput }),
  };

  // Query filter for Queries model
  const queryFilter = {
    userId: uid,
    workspaceId: wsObjectId,
    ...(searchTopicInput && { searchTopic: searchTopicInput }),
  };

  // Get total count and queries
  const [totalDocs, queries] = await Promise.all([
    SavedDoc.countDocuments(baseDocFilter),
    Queries.find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  // Single batch fetch: all saved docs for this workspace (avoids N+1 per-query finds)
  const allDocs = await SavedDoc.find(baseDocFilter)
    .sort({ createdAt: 1 })
    .lean();

  // Group docs by queryId in memory (and collect orphaned: null/missing queryId)
  const docsByQueryId = new Map();
  const orphaned = [];
  for (const doc of allDocs) {
    const qid = doc.queryId;
    if (qid == null || qid === undefined) {
      orphaned.push(doc);
    } else {
      const key = String(qid);
      if (!docsByQueryId.has(key)) docsByQueryId.set(key, []);
      docsByQueryId.get(key).push(doc);
    }
  }

  const list = [];
  for (const queryEntry of queries) {
    const key = String(queryEntry._id);
    let initialDocs = docsByQueryId.get(key) || [];

    if (initialDocs.length === 0 && orphaned.length > 0) {
      const toLink = orphaned.splice(0, 10);
      const ids = toLink.map((d) => d._id);
      await SavedDoc.updateMany(
        { _id: { $in: ids }, userId: uid },
        { $set: { queryId: queryEntry._id } }
      );
      initialDocs = toLink;
    }

    const documents = initialDocs.map(doc => mapSavedDocToResponse(doc));

    list.push({
      _id: queryEntry._id,
      userId: queryEntry.userId,
      query: queryEntry.query,
      searchTopic: queryEntry.searchTopic,
      createdAt: queryEntry.createdAt,
      documents,
    });
  }

  // If no queries but documents exist, create a fallback query entry (use in-memory orphaned)
  const hasDocuments = list.some((item) => item.documents && item.documents.length > 0);

  if (!hasDocuments && orphaned.length > 0) {
    const mappedOrphaned = orphaned.slice(0, 50).map(doc => mapSavedDocToResponse(doc));

    list.unshift({
      _id: 'fallback-query',
      userId: uid,
      query: 'Saved Documents',
      searchTopic: searchTopicInput || 'default',
      createdAt: new Date(),
      documents: mappedOrphaned,
    });
  }

  const totalDocsReturned = list.reduce((sum, item) => sum + (item.documents?.length || 0), 0);
  debugLog("[querylist]", { userId: req.user.id, workspaceId, count: totalDocsReturned });

  // Apply runtime metadata normalization to all documents before sending to frontend
  for (const item of list) {
    for (const doc of item.documents || []) {
      if (doc.docdata) {
        const [normalized] = normalizeDocumentArray([doc.docdata]);
        doc.docdata = normalized;
      }
    }
  }

  res.json({ list });
};

// ---- counts used by workspace list badge ----------------------------------

/**
 * POST /api/saveddocs/countsByWorkspace
 * body: { userId }
 * resp: { items: [ { ws_id, count } ] }
 * Uses SavedDoc (saved_docs) for consistency with add/save/querylist.
 */
const getCountsByWorkspace = async (req, res) => {
  const userId = req.user.id;
  const uid = toId(userId);
  if (!uid) return res.status(400).json({ items: [] });

  const items = await SavedDoc.aggregate([
    { $match: { userId: uid, isRemoved: false, workspaceId: { $exists: true, $ne: null } } },
    { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    { $project: { _id: 0, ws_id: { $toString: '$_id' }, count: 1 } },
  ]);

  res.json({ items });
};

module.exports = {
  addSavedDoc,
  removeSavedDoc,
  getSavedDocByExternalId,
  saveQueryOnSearch,
  getQueryList,
  getCountsByWorkspace,
};
