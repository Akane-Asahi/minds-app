#!/usr/bin/env node
/**
 * Recompute Workspace Counts (verification script)
 *
 * For each workspace, computes resourceCount and queryCount via aggregation
 * from SavedDoc (saved_docs) and Queries collections.
 *
 * Run: node backend/scripts/recompute-workspace-counts.js
 * Requires: MONGO_URI in .env or as env var
 *
 * This script is read-only: it prints counts for verification.
 * Counts are no longer stored on Workspace; they are computed at runtime.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const Workspace = require('../models/workspaceModel');
const SavedDoc = require('../models/savedDocModel');
const Query = require('../models/queriesModel');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI or MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('\n=== Recompute Workspace Counts (verification) ===\n');

  const workspaces = await Workspace.find({}).lean();
  if (!workspaces.length) {
    console.log('No workspaces found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const workspaceIds = workspaces.map((w) => w._id);

  const [queryCounts, savedDocCounts] = await Promise.all([
    Query.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ]),
    SavedDoc.aggregate([
      { $match: { workspaceId: { $in: workspaceIds }, isRemoved: false } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } }
    ])
  ]);

  const queryCountMap = new Map(queryCounts.map((i) => [String(i._id), i.count]));
  const savedDocCountMap = new Map(savedDocCounts.map((i) => [String(i._id), i.count]));

  console.log('Workspace ID                              | Title                    | resourceCount | queryCount');
  console.log('-'.repeat(95));

  for (const ws of workspaces) {
    const id = String(ws._id);
    const resourceCount = savedDocCountMap.get(id) ?? 0;
    const queryCount = queryCountMap.get(id) ?? 0;
    const title = (ws.title || '').slice(0, 24).padEnd(24);
    console.log(`${id} | ${title} | ${String(resourceCount).padStart(13)} | ${String(queryCount).padStart(10)}`);
  }

  console.log('-'.repeat(95));
  console.log('Counts are computed at runtime from SavedDoc (saved_docs) and Queries. Not stored on Workspace.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
