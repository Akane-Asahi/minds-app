#!/usr/bin/env node
/**
 * Read-only report: lists baseline records that would be removed by cleanupBaselineData.js
 * (invalid/orphaned workspaces, queries, saved docs — same rules as ownership scan).
 *
 * Run: npm run report:baseline-cleanup
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Queries = require('../models/queriesModel');
const SavedDoc = require('../models/savedDocModel');
const { scanBaselineInvalid } = require('./lib/baselineOwnershipScan');

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

  const scan = scanBaselineInvalid(users, workspaces, queries, savedDocs);

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  BASELINE CLEANUP REPORT (read-only) — records to remove              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const printSection = (title, idSet, reasonsMap) => {
    console.log(`── ${title} (${idSet.size}) ──\n`);
    if (idSet.size === 0) {
      console.log('   (none)\n');
      return;
    }
    for (const id of idSet) {
      const reasons = reasonsMap.get(id) || [];
      console.log(`   • id: ${id}`);
      reasons.forEach((r) => console.log(`     reason: ${r}`));
      console.log('');
    }
  };

  printSection('Workspaces with missing/invalid user (orphaned ownership)', scan.invalidWorkspaceIds, scan.workspaceReasons);
  printSection('Queries with missing user, missing workspace, or user/workspace mismatch', scan.invalidQueryIds, scan.queryReasons);
  printSection('Saved docs with missing links, wrong owner, or invalid queryId', scan.invalidSavedDocIds, scan.savedDocReasons);

  console.log('── Summary ──');
  console.log(`   Workspaces to remove:  ${scan.invalidWorkspaceIds.size}`);
  console.log(`   Queries to remove:      ${scan.invalidQueryIds.size}`);
  console.log(`   Saved docs to remove:   ${scan.invalidSavedDocIds.size}`);
  console.log('\n   Dry-run delete:  npm run cleanup:baseline');
  console.log('   Apply deletion:  npm run cleanup:baseline -- --apply\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
