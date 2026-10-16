#!/usr/bin/env node
/**
 * Baseline user-study audit: read-only ownership & reference checks.
 *
 * Run: npm run audit:baseline
 * Requires: MONGO_URI or MONGODB_URI in backend/.env (same file as backend/server.js) or env.
 */

const path = require('path');
// Align with server.js: load backend/.env (not repo root — Baseline keeps secrets there).
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Queries = require('../models/queriesModel');
const SavedDoc = require('../models/savedDocModel');

function strId(id) {
  if (id == null) return '';
  return String(id);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri || String(uri).trim() === '') {
    console.error('MONGO_URI or MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const users = await User.find().lean();
  const workspaces = await Workspace.find().lean();
  const queries = await Queries.find().lean();
  const savedDocs = await SavedDoc.find().lean();

  const usersById = new Map(users.map((u) => [strId(u._id), u]));
  const workspacesById = new Map(workspaces.map((w) => [strId(w._id), w]));
  const queriesById = new Map(queries.map((q) => [strId(q._id), q]));

  let errorCount = 0;

  function err(message, detailLines = []) {
    errorCount += 1;
    console.log(`\n[ERROR] ${message}`);
    for (const line of detailLines) {
      console.log(`        ${line}`);
    }
  }

  const divider = () => console.log('\n' + '─'.repeat(72) + '\n');

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  BASELINE DATA AUDIT (read-only) — ownership & references            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  divider();
  console.log('§ 1 — Workspace ownership\n');

  for (const ws of workspaces) {
    const wsId = strId(ws._id);
    const uid = ws.userId;

    if (uid == null) {
      err('Workspace missing userId (required ownership link)', [`workspaceId: ${wsId}`]);
      continue;
    }

    if (!usersById.has(strId(uid))) {
      err('Workspace references missing user', [`workspaceId: ${wsId}`, `workspace.userId: ${strId(uid)}`]);
    }
  }

  divider();
  console.log('§ 2 — Query ownership & workspace links\n');

  for (const q of queries) {
    const qid = strId(q._id);
    const qUser = q.userId;
    const qWs = q.workspaceId;

    if (qUser == null) {
      err('Query missing userId (required ownership link)', [`queryId: ${qid}`]);
      continue;
    }

    if (!usersById.has(strId(qUser))) {
      err('Query references missing or invalid user', [`queryId: ${qid}`, `query.userId: ${strId(qUser)}`]);
    }

    if (qWs == null) {
      err('Query missing workspaceId (orphan — no valid workspace link)', [
        `queryId: ${qid}`,
        `query.userId: ${strId(qUser)}`,
      ]);
      continue;
    }

    if (!workspacesById.has(strId(qWs))) {
      err('Query references missing workspace', [
        `queryId: ${qid}`,
        `query.workspaceId: ${strId(qWs)}`,
        `query.userId: ${strId(qUser)}`,
      ]);
      continue;
    }

    const ws = workspacesById.get(strId(qWs));
    if (strId(ws.userId) !== strId(qUser)) {
      err('Query belongs to different user than workspace owner', [
        `queryId: ${qid}`,
        `query.userId: ${strId(qUser)}`,
        `workspaceId: ${strId(qWs)}`,
        `workspace.userId: ${strId(ws.userId)}`,
      ]);
    }
  }

  divider();
  console.log('§ 3 — Saved document ownership & query links\n');

  for (const sd of savedDocs) {
    const sdid = strId(sd._id);
    const sdUser = sd.userId;
    const sdWs = sd.workspaceId;

    if (sdUser == null) {
      err('SavedDoc missing userId (required ownership link)', [`savedDocId: ${sdid}`]);
      continue;
    }

    if (sdWs == null) {
      err('SavedDoc missing workspaceId (orphan — no valid workspace link)', [
        `savedDocId: ${sdid}`,
        `savedDoc.userId: ${strId(sdUser)}`,
      ]);
      continue;
    }

    if (!workspacesById.has(strId(sdWs))) {
      err('SavedDoc references missing workspace', [
        `savedDocId: ${sdid}`,
        `workspaceId: ${strId(sdWs)}`,
        `savedDoc.userId: ${strId(sdUser)}`,
      ]);
      continue;
    }

    const ws = workspacesById.get(strId(sdWs));
    if (strId(ws.userId) !== strId(sdUser)) {
      err('SavedDoc user does not match workspace owner', [
        `savedDocId: ${sdid}`,
        `savedDoc.userId: ${strId(sdUser)}`,
        `workspaceId: ${strId(sdWs)}`,
        `workspace.userId: ${strId(ws.userId)}`,
      ]);
    }

    const qidRef = sd.queryId;
    if (qidRef != null) {
      if (!queriesById.has(strId(qidRef))) {
        err('SavedDoc references invalid or missing queryId', [
          `savedDocId: ${sdid}`,
          `queryId: ${strId(qidRef)}`,
          `savedDoc.userId: ${strId(sdUser)}`,
        ]);
      } else {
        const qq = queriesById.get(strId(qidRef));
        if (strId(qq.userId) !== strId(sdUser)) {
          err('SavedDoc queryId points to query owned by a different user', [
            `savedDocId: ${sdid}`,
            `savedDoc.userId: ${strId(sdUser)}`,
            `queryId: ${strId(qidRef)}`,
            `query.userId: ${strId(qq.userId)}`,
          ]);
        }
        if (qq.workspaceId != null && strId(qq.workspaceId) !== strId(sdWs)) {
          err('SavedDoc query workspaceId does not match savedDoc.workspaceId', [
            `savedDocId: ${sdid}`,
            `savedDoc.workspaceId: ${strId(sdWs)}`,
            `queryId: ${strId(qidRef)}`,
            `query.workspaceId: ${strId(qq.workspaceId)}`,
          ]);
        }
      }
    }
  }

  divider();
  console.log('§ 4 — Duplicate active saved documents (isRemoved === false)\n');

  const groupKey = (doc) =>
    `${strId(doc.userId)}|${strId(doc.workspaceId)}|${String(doc.externalId || '').trim()}`;
  const byKey = new Map();
  for (const sd of savedDocs) {
    if (sd.userId == null || sd.workspaceId == null) continue;
    const k = groupKey(sd);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(sd);
  }

  for (const [, docs] of byKey) {
    const active = docs.filter((d) => d.isRemoved !== true);
    if (active.length > 1) {
      err('Duplicate active saved doc found (same userId, workspaceId, externalId)', [
        `activeCount: ${active.length}`,
        `userId: ${strId(active[0].userId)}`,
        `workspaceId: ${strId(active[0].workspaceId)}`,
        `externalId: ${String(active[0].externalId)}`,
        `savedDocIds: ${active.map((d) => strId(d._id)).join(', ')}`,
      ]);
    }
  }

  divider();
  console.log('§ 5 — Per-user summary (counts for baseline inventory)\n');

  for (const u of users) {
    const id = strId(u._id);
    const username = u.username != null ? String(u.username) : '(no username)';
    const wsCount = workspaces.filter((w) => strId(w.userId) === id).length;
    const qCount = queries.filter((q) => q.userId != null && strId(q.userId) === id).length;
    const sdCount = savedDocs.filter((s) => s.userId != null && strId(s.userId) === id).length;

    console.log(
      `[OK] User summary  userId=${id}  username=${username}  workspaces=${wsCount}  queries=${qCount}  savedDocs=${sdCount}`
    );
  }

  divider();
  console.log('§ 6 — Final summary\n');
  console.log(`  Total users checked:       ${users.length}`);
  console.log(`  Total workspaces checked:  ${workspaces.length}`);
  console.log(`  Total queries checked:     ${queries.length}`);
  console.log(`  Total saved docs checked:  ${savedDocs.length}`);
  console.log(`  Total errors found:        ${errorCount}`);
  console.log('');

  if (errorCount === 0) {
    console.log('  [OK] No ownership inconsistencies detected. Baseline data looks consistent.\n');
  } else {
    console.log('  Review [ERROR] lines above before running the user study.\n');
  }

  await mongoose.disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
