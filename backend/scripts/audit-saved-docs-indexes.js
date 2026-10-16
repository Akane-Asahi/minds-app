#!/usr/bin/env node
/**
 * Audit Saved Docs Indexes
 *
 * Run with: node backend/scripts/audit-saved-docs-indexes.js
 * Requires: MONGO_URI in .env or as env var
 *
 * Prints existing indexes for both saved docs collections and instructs
 * how to drop any unique index that would enforce "one doc per query".
 *
 * Safe to run - read-only, no modifications.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const COLLECTIONS = ['saveddocs', 'saved_docs'];

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI or MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName || 'test';

  console.log('\n=== Saved Docs Index Audit ===\n');

  for (const collName of COLLECTIONS) {
    try {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`Collection: ${collName}`);
      console.log('Indexes:');
      indexes.forEach((idx) => {
        const keys = JSON.stringify(idx.key);
        const unique = idx.unique ? ' [UNIQUE]' : '';
        const partial = idx.partialFilterExpression
          ? ` partial: ${JSON.stringify(idx.partialFilterExpression)}`
          : '';
        console.log(`  - ${idx.name}: ${keys}${unique}${partial}`);
      });

      // Check for problematic indexes (query-based uniqueness - blocks multi-doc-per-query)
      const problematic = indexes.filter((idx) => {
        const keys = Object.keys(idx.key);
        const hasQueryId = keys.includes('queryId');
        const hasSearchTopic = keys.includes('searchTopic');
        const hasQueryText = keys.includes('queryText');
        const hasWorkspaceId = keys.includes('workspaceId');
        const hasExternalId = keys.includes('externalId');
        const isUnique = idx.unique === true;
        if (!isUnique) return false;
        if (hasQueryId) return true;
        if (hasQueryText) return true;
        if (hasSearchTopic && !(hasWorkspaceId && hasExternalId))
          return true; // e.g. (userId, searchTopic, ControlNumber) - one per query
        return false;
      });

      if (problematic.length > 0) {
        console.log('\n  ⚠️  PROBLEMATIC indexes (enforce one-per-query, can block migration):');
        problematic.forEach((idx) => {
          console.log(`     Drop: db.${collName}.dropIndex("${idx.name}")`);
          console.log(`     Or:   mongosh "<MONGO_URI>" --eval 'db.getSiblingDB("${dbName}").${collName}.dropIndex("${idx.name}")'`);
        });
      }
      console.log('');
    } catch (err) {
      if (err.codeName === 'NamespaceNotFound') {
        console.log(`Collection: ${collName} (does not exist yet)\n`);
      } else {
        console.error(`Error for ${collName}:`, err.message);
      }
    }
  }

  console.log('Expected for saved_docs (SavedDoc):');
  console.log('  - unique on (userId, workspaceId, externalId) partial isRemoved=false');
  console.log('  - NO unique on queryId, searchTopic, queryText, or ControlNumber alone\n');

  console.log('--- MIGRATION: Drop bad indexes ---');
  console.log('If problematic indexes were found above, run the dropIndex commands shown.');
  console.log('Example for saveddocs (legacy one-per-query index):');
  console.log('  mongosh "<MONGO_URI>" --eval \'db.getSiblingDB("' + dbName + '").saveddocs.dropIndex("userId_1_searchTopic_1_ControlNumber_1")\'');
  console.log('Replace <MONGO_URI> with your connection string.\n');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
