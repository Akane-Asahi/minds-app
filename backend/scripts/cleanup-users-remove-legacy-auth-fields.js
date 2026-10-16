#!/usr/bin/env node
/**
 * One-time maintenance: Remove legacy auth fields from User documents.
 *
 * WARNING: Run once. Safe and idempotent. Does NOT delete documents.
 *
 * 1) Unsets: email, password, username
 * 2) Lists indexes and drops any that include email or username
 *
 * Run: node backend/scripts/cleanup-users-remove-legacy-auth-fields.js
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

  const collName = 'users';
  const coll = db.collection(collName);

  try {
    // 1) Unset legacy fields
    const result = await coll.updateMany(
      {},
      { $unset: { email: '', password: '', username: '' } }
    );
    console.log('\n=== Unset legacy fields ===');
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);

    // 2) List and drop indexes that include email or username
    const indexes = await coll.indexes();
    const toDrop = indexes.filter((idx) => {
      if (idx.name === '_id_') return false;
      const keys = Object.keys(idx.key || {});
      return keys.some((k) => k === 'email' || k === 'username');
    });

    if (toDrop.length > 0) {
      console.log('\n=== Dropping legacy indexes ===');
      for (const idx of toDrop) {
        try {
          await coll.dropIndex(idx.name);
          console.log('Dropped:', idx.name);
        } catch (err) {
          console.error('Failed to drop', idx.name, err.message);
        }
      }
    } else {
      console.log('\nNo legacy indexes (email/username) found.');
    }

    console.log('\nUser legacy auth fields removed successfully.');
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
