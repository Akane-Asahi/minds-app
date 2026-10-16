#!/usr/bin/env node
/**
 * One-time maintenance: Remove legacy unused fields from Workspace documents.
 *
 * WARNING: Run once. Safe and idempotent (re-running has no effect if fields
 * are already absent). Does NOT delete documents; only unsets fields.
 *
 * Unsets: resourceCount, queryCount, notes, searchTerms
 *
 * Run: npm run cleanup-workspaces
 * Or:  node backend/scripts/cleanup-workspaces-unset-legacy-fields.js
 * Requires: MONGO_URI or MONGODB_URI in .env or as env var
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

mongoose.strictQuery = true;

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI or MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName || 'unknown';
  console.log('Connected to DB:', dbName);

  try {
    const coll = db.collection('workspaces');
    const result = await coll.updateMany(
      {},
      { $unset: { resourceCount: '', queryCount: '', notes: '', searchTerms: '' } }
    );

    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);
    console.log('Workspace legacy fields removed successfully.');
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
