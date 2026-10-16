/**
 * Shared logic: find invalid/orphaned baseline records (User → Workspace → Query → SavedDoc).
 * Used by reportBaselineCleanup.js and cleanupBaselineData.js — no DB I/O here.
 */

function strId(id) {
  if (id == null) return '';
  return String(id);
}

/**
 * @param {object[]} users - lean User docs
 * @param {object[]} workspaces - lean Workspace docs
 * @param {object[]} queries - lean Queries docs
 * @param {object[]} savedDocs - lean SavedDoc docs
 * @returns {{
 *   usersById: Map,
 *   workspacesById: Map,
 *   queriesById: Map,
 *   invalidWorkspaceIds: Set<string>,
 *   invalidQueryIds: Set<string>,
 *   invalidSavedDocIds: Set<string>,
 *   workspaceReasons: Map<string, string[]>,
 *   queryReasons: Map<string, string[]>,
 *   savedDocReasons: Map<string, string[]>,
 * }}
 */
function scanBaselineInvalid(users, workspaces, queries, savedDocs) {
  const usersById = new Map(users.map((u) => [strId(u._id), u]));
  const workspacesById = new Map(workspaces.map((w) => [strId(w._id), w]));
  const queriesById = new Map(queries.map((q) => [strId(q._id), q]));

  const invalidWorkspaceIds = new Set();
  const workspaceReasons = new Map();

  function addWsReason(id, msg) {
    const k = strId(id);
    if (!workspaceReasons.has(k)) workspaceReasons.set(k, []);
    workspaceReasons.get(k).push(msg);
    invalidWorkspaceIds.add(k);
  }

  for (const ws of workspaces) {
    const wsId = strId(ws._id);
    if (ws.userId == null) {
      addWsReason(ws._id, 'missing workspace.userId');
      continue;
    }
    if (!usersById.has(strId(ws.userId))) {
      addWsReason(ws._id, `workspace.userId references missing user (${strId(ws.userId)})`);
    }
  }

  const invalidQueryIds = new Set();
  const queryReasons = new Map();

  function addQueryReason(id, msg) {
    const k = strId(id);
    if (!queryReasons.has(k)) queryReasons.set(k, []);
    queryReasons.get(k).push(msg);
    invalidQueryIds.add(k);
  }

  for (const q of queries) {
    const qid = strId(q._id);
    if (q.userId == null) {
      addQueryReason(q._id, 'missing query.userId');
      continue;
    }
    if (!usersById.has(strId(q.userId))) {
      addQueryReason(q._id, `query.userId references missing user (${strId(q.userId)})`);
      continue;
    }
    if (q.workspaceId == null) {
      addQueryReason(q._id, 'missing query.workspaceId');
      continue;
    }
    const qWs = strId(q.workspaceId);
    if (!workspacesById.has(qWs)) {
      addQueryReason(q._id, `query.workspaceId references missing workspace (${qWs})`);
      continue;
    }
    if (invalidWorkspaceIds.has(qWs)) {
      addQueryReason(q._id, `query.workspaceId points to invalid workspace (${qWs})`);
      continue;
    }
    const ws = workspacesById.get(qWs);
    if (strId(ws.userId) !== strId(q.userId)) {
      addQueryReason(
        q._id,
        `query.userId (${strId(q.userId)}) does not match workspace owner (${strId(ws.userId)})`
      );
    }
  }

  const invalidSavedDocIds = new Set();
  const savedDocReasons = new Map();

  function addSdReason(id, msg) {
    const k = strId(id);
    if (!savedDocReasons.has(k)) savedDocReasons.set(k, []);
    savedDocReasons.get(k).push(msg);
    invalidSavedDocIds.add(k);
  }

  for (const sd of savedDocs) {
    const sdid = strId(sd._id);
    if (sd.userId == null) {
      addSdReason(sd._id, 'missing savedDoc.userId');
      continue;
    }
    if (sd.workspaceId == null) {
      addSdReason(sd._id, 'missing savedDoc.workspaceId');
      continue;
    }
    const sdWs = strId(sd.workspaceId);
    if (!workspacesById.has(sdWs)) {
      addSdReason(sd._id, `savedDoc.workspaceId references missing workspace (${sdWs})`);
      continue;
    }
    if (invalidWorkspaceIds.has(sdWs)) {
      addSdReason(sd._id, `savedDoc.workspaceId points to invalid workspace (${sdWs})`);
      continue;
    }
    const ws = workspacesById.get(sdWs);
    if (strId(ws.userId) !== strId(sd.userId)) {
      addSdReason(
        sd._id,
        `savedDoc.userId (${strId(sd.userId)}) does not match workspace owner (${strId(ws.userId)})`
      );
    }

    const qidRef = sd.queryId;
    if (qidRef != null) {
      const qr = strId(qidRef);
      if (!queriesById.has(qr)) {
        addSdReason(sd._id, `savedDoc.queryId references missing query (${qr})`);
      } else {
        const qq = queriesById.get(qr);
        if (invalidQueryIds.has(qr)) {
          addSdReason(sd._id, `savedDoc.queryId points to invalid query (${qr})`);
        } else if (strId(qq.userId) !== strId(sd.userId)) {
          addSdReason(
            sd._id,
            `query.userId (${strId(qq.userId)}) does not match savedDoc.userId (${strId(sd.userId)})`
          );
        } else if (qq.workspaceId != null && strId(qq.workspaceId) !== sdWs) {
          addSdReason(
            sd._id,
            `query.workspaceId (${strId(qq.workspaceId)}) does not match savedDoc.workspaceId (${sdWs})`
          );
        }
      }
    }
  }

  return {
    usersById,
    workspacesById,
    queriesById,
    invalidWorkspaceIds,
    invalidQueryIds,
    invalidSavedDocIds,
    workspaceReasons,
    queryReasons,
    savedDocReasons,
  };
}

module.exports = {
  strId,
  scanBaselineInvalid,
};
