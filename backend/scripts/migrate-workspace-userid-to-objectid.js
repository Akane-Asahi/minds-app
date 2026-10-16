#!/usr/bin/env node
/**
 * One-time migration: Convert workspace.userId from string to ObjectId.
 *
 * Workspaces may have userId stored as string (e.g. "698964...") which breaks
 * Mongo filtering with ObjectId and risks multi-user isolation.
 *
 * This script finds docs where userId is a 24-char hex string and converts to ObjectId.
 *
 * Run once: node backend/scripts/migrate-workspace-userid-to-objectid.js
 * Requires: MONGO_URI or MONGODB_URI in .env or as env var
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const ObjectId = mongoose.Types.ObjectId;

function isValidObjectIdString(v) {
  if (typeof v !== 'string') return false;
  return /^[a-fA-F0-9]{24}$/.test(v) && ObjectId.isValid(v);
}

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

  const coll = db.collection('workspaces');
  let converted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const cursor = coll.find({});
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      const userId = doc.userId;
      if (!userId) {
        skipped++;
        continue;
      }

      // Already ObjectId
      if (userId instanceof ObjectId) {
        skipped++;
        continue;
      }

      // String that can be converted to ObjectId
      if (isValidObjectIdString(userId)) {
        try {
          const result = await coll.updateOne(
            { _id: doc._id },
            { $set: { userId: new ObjectId(userId) } }
          );
          if (result.modifiedCount > 0) {
            converted++;
            console.log('  Converted:', doc._id, 'userId:', userId, '-> ObjectId');
          }
        } catch (err) {
          errors++;
          console.error('  Error converting', doc._id, err.message);
        }
      } else {
        skipped++;
        console.log('  Skipped (invalid userId):', doc._id, 'userId type:', typeof userId);
      }
    }

    console.log('\nDone. Converted:', converted, 'Skipped:', skipped, 'Errors:', errors);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
