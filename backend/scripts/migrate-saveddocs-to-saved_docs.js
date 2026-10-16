#!/usr/bin/env node
/**
 * Migration: saveddocs → saved_docs
 *
 * WHY: Legacy collection "saveddocs" has query-based unique indexes that block
 * saving multiple documents per query. The new "saved_docs" collection uses
 * document-based uniqueness (userId, workspaceId, externalId) and supports
 * multi-doc-per-query. Tags and timeline events reference savedDocId; we must
 * preserve _id so those references keep working.
 *
 * HOW TO RUN:
 *   MONGO_URI=<uri> node backend/scripts/migrate-saveddocs-to-saved_docs.js
 *   DRY_RUN=1 node backend/scripts/migrate-saveddocs-to-saved_docs.js  # log only
 *
 * ROLLBACK: Do not delete saved_docs. The app reads from saved_docs for new
 * saves; legacy saveddocs remains untouched. To rollback, revert code to read
 * from saveddocs and re-run ensureSavedDocForUser migration logic.
 *
 * RULES: No deletes, no modifications to legacy, no tag/timeline changes.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function toObjectId(v) {
  if (!v) return null;
  try {
    return new mongoose.Types.ObjectId(v);
  } catch {
    return null;
  }
}

function buildDoc(legacy) {
  const externalId = (legacy.externalId || legacy.ControlNumber || '').trim();
  if (!externalId) return null;

  const workspaceId = toObjectId(legacy.workspaceId);
  const userId = toObjectId(legacy.userId);
  if (!userId) return null;
  if (!workspaceId) return null;

  const queryText = (legacy.queryText || legacy.searchTopic || 'Manual Tagging').trim() || 'Manual Tagging';
  const searchTopic = (legacy.searchTopic || queryText).trim();
  const title = (legacy.title || legacy.docdata?.Title || legacy.docdata?.title || '').trim();

  return {
    _id: legacy._id,
    userId,
    workspaceId,
    externalId,
    title,
    queryText,
    docdata: legacy.docdata || {},
    searchTopic,
    queryId: toObjectId(legacy.queryId) || null,
    firstSavedQueryId: toObjectId(legacy.queryId) || null,
    firstSavedQueryText: searchTopic,
    lastSeenQueryId: toObjectId(legacy.queryId) || null,
    lastSeenQueryText: queryText,
    isRemoved: legacy.isRemoved === true,
    createdAt: legacy.createdAt || new Date(),
    updatedAt: legacy.updatedAt || new Date(),
  };
}

function dedupeKey(doc) {
  const uid = toObjectId(doc.userId);
  const wid = toObjectId(doc.workspaceId);
  const ext = (doc.externalId || doc.ControlNumber || '').trim();
  if (!uid || !wid || !ext) return null;
  return `${uid}:${wid}:${ext}`;
}

async function main() {
  if (!MONGO_URI) {
    console.error('MONGO_URI or MONGODB_URI required');
    process.exit(1);
  }

  console.log('\n=== Migration: saveddocs → saved_docs ===');
  if (DRY_RUN) console.log('DRY_RUN=1: no writes, logging only\n');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const legacyColl = db.collection('saveddocs');
  const newColl = db.collection('saved_docs');

  const legacyCount = await legacyColl.countDocuments({});
  console.log(`Legacy saveddocs: ${legacyCount} documents`);

  const existingIds = new Set();
  const existingCursor = newColl.find({}, { projection: { _id: 1 } });
  for await (const d of existingCursor) {
    existingIds.add(String(d._id));
  }
  console.log(`saved_docs already has: ${existingIds.size} documents`);

  const allLegacy = await legacyColl.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  const byKey = new Map();
  for (const doc of allLegacy) {
    const key = dedupeKey(doc);
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, doc);
    }
  }

  const toInsert = [];
  const toInsertAsRemoved = [];

  for (const doc of allLegacy) {
    const key = dedupeKey(doc);
    if (!key) {
      console.warn('  Skip (no valid userId/workspaceId/externalId):', doc._id);
      continue;
    }

    const winner = byKey.get(key);
    const normalized = buildDoc(doc);
    if (!normalized) {
      console.warn('  Skip (buildDoc failed):', doc._id);
      continue;
    }

    if (existingIds.has(String(doc._id))) {
      if (DRY_RUN) console.log('  Skip (already in saved_docs):', doc._id);
      continue;
    }

    const isWinner = String(doc._id) === String(winner._id);
    if (isWinner) {
      normalized.isRemoved = doc.isRemoved === true;
      toInsert.push(normalized);
    } else {
      normalized.isRemoved = true;
      toInsertAsRemoved.push(normalized);
    }
  }


  if (DRY_RUN) {
    console.log('\nWould insert (active):', toInsert.length);
    console.log('Would insert (duplicates, isRemoved=true):', toInsertAsRemoved.length);
    console.log('\nDRY_RUN complete. Run without DRY_RUN=1 to execute.\n');
    await mongoose.disconnect();
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of [...toInsert, ...toInsertAsRemoved]) {
    try {
      await newColl.insertOne(doc);
      inserted++;
      if (inserted % 100 === 0) console.log('  Inserted:', inserted);
    } catch (err) {
      if (err.code === 11000) {
        skipped++;
        console.warn('  Duplicate key (skipped):', doc._id, err.keyPattern || '');
      } else {
        errors++;
        console.error('  Error inserting', doc._id, err.message);
      }
    }
  }

  console.log('\nDone. Inserted:', inserted, 'Skipped (dup):', skipped, 'Errors:', errors);
  console.log('Legacy saveddocs unchanged. Tags and timeline events unchanged.\n');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
