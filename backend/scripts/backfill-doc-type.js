#!/usr/bin/env node
/**
 * Backfill doc_type (and optionally iconType) for existing saved documents.
 *
 * - Sets doc_type from docdata.pnx.display.type[0] when present.
 * - When pnx is missing, leaves doc_type as-is or sets to "Other" if missing/empty.
 * - Does not overwrite doc_type if it already looks valid (non-empty, not "General Document").
 *
 * Run from project root:
 *   node backend/scripts/backfill-doc-type.js
 *
 * Or from backend/:
 *   node scripts/backfill-doc-type.js
 *
 * Requires: MONGO_URI (or MONGODB_URI) in backend/.env or project root .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const SavedDoc = require('../models/savedDocModel');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI or MONGODB_URI required (set in backend/.env or .env)');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('\n=== Backfill doc_type for saved documents ===\n');

  const docs = await SavedDoc.find({}).lean();
  let updated = 0;
  let skipped = 0;
  let setOther = 0;

  for (const doc of docs) {
    const docdata = doc.docdata || {};
    const pnx = docdata.pnx;
    const displayType = pnx?.display?.type?.[0];
    const currentDocType = (doc.doc_type != null && doc.doc_type !== undefined) ? String(doc.doc_type).trim() : '';

    if (displayType) {
      const newDocType = String(displayType).trim();
      if (newDocType !== currentDocType) {
        await SavedDoc.updateOne(
          { _id: doc._id },
          { $set: { doc_type: newDocType } }
        );
        updated++;
        console.log(`  ${doc._id}: doc_type "${currentDocType || '(empty)'}" → "${newDocType}" (from pnx.display.type)`);
      } else {
        skipped++;
      }
      continue;
    }

    if (!currentDocType || currentDocType === 'General Document') {
      const fallback = currentDocType === 'General Document' ? 'Other' : (currentDocType || 'Other');
      await SavedDoc.updateOne(
        { _id: doc._id },
        { $set: { doc_type: fallback } }
      );
      setOther++;
      if (fallback === 'Other') {
        console.log(`  ${doc._id}: doc_type "${currentDocType || '(empty)'}" → "Other" (no pnx)`);
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`  Total docs: ${docs.length}`);
  console.log(`  Updated:    ${updated}`);
  console.log(`  Set to Other (no pnx): ${setOther}`);
  console.log(`  Skipped:    ${skipped}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
