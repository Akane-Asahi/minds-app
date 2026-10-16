#!/usr/bin/env node
/**
 * Baseline DB cleanup: removes ONLY invalid/orphaned workspaces, queries, and saved docs.
 *
 *   npm run cleanup:baseline           → dry run (no deletes)
 *   npm run cleanup:baseline -- --apply → perform deletes
 *
 * Loads backend/.env like server.js. Does not change schemas or auth.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Queries = require('../models/queriesModel');
const SavedDoc = require('../models/savedDocModel');
const { scanBaselineInvalid, strId } = require('./lib/baselineOwnershipScan');

function toObjectIds(idStrings) {
  return [...idStrings].map((id) => new mongoose.Types.ObjectId(id));
}

async function main() {
  const apply = process.argv.includes('--apply');

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

  const scan = scanBaselineInvalid(users, workspaces, queries, savedDocs);

  const sdIds = toObjectIds(scan.invalidSavedDocIds);
  const qIds = toObjectIds(scan.invalidQueryIds);
  const wsIds = toObjectIds(scan.invalidWorkspaceIds);

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log(
    `║  BASELINE CLEANUP ${apply ? '— APPLY (deleting)' : '— DRY RUN (no deletes)'}`.padEnd(71) + '║'
  );
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log(`   Saved docs to delete:   ${sdIds.length}`);
  console.log(`   Queries to delete:      ${qIds.length}`);
  console.log(`   Workspaces to delete:   ${wsIds.length}`);

  if (!apply) {
    console.log('\n   No changes made. Re-run with --apply to delete these records.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (sdIds.length === 0 && qIds.length === 0 && wsIds.length === 0) {
    console.log('\n   Nothing to delete.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('\n── Deleting (order: SavedDoc → Queries → Workspace) ──\n');

  let sdResult = { deletedCount: 0 };
  if (sdIds.length > 0) {
    sdResult = await SavedDoc.deleteMany({ _id: { $in: sdIds } });
    console.log(`   [DELETE] SavedDoc.deleteMany matched/deleted: ${sdResult.deletedCount}`);
    sdIds.forEach((id) => console.log(`            - savedDocId: ${strId(id)}`));
  }

  let qResult = { deletedCount: 0 };
  if (qIds.length > 0) {
    qResult = await Queries.deleteMany({ _id: { $in: qIds } });
    console.log(`\n   [DELETE] Queries.deleteMany matched/deleted: ${qResult.deletedCount}`);
    qIds.forEach((id) => console.log(`            - queryId: ${strId(id)}`));
  }

  let wsResult = { deletedCount: 0 };
  if (wsIds.length > 0) {
    wsResult = await Workspace.deleteMany({ _id: { $in: wsIds } });
    console.log(`\n   [DELETE] Workspace.deleteMany matched/deleted: ${wsResult.deletedCount}`);
    wsIds.forEach((id) => console.log(`            - workspaceId: ${strId(id)}`));
  }

  console.log('\n   Done. Run: npm run audit:baseline\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
