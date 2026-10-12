/**
 * Backfill the per-conversation `seq` on legacy Mongo messages and sync
 * `conversations.lastSeq` in Postgres.
 *
 * Messages created before the `seq` rollout have no ordering key, which breaks
 * seq-based pagination for existing conversations. This script renumbers each
 * conversation's messages by `createdAt` (1..N) and is safe to re-run: it skips
 * conversations that are already correctly sequenced.
 *
 * Usage:  node scripts/backfill-message-seq.js
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { Client } = require('pg');

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const messages = mongoose.connection.collection('messages');

  const pg = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.PGADMIN_URI,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await pg.connect();

  const conversationIds = await messages.distinct('conversationId');
  let updatedConversations = 0;
  let updatedMessages = 0;

  for (const conversationId of conversationIds) {
    const docs = await messages
      .find({ conversationId })
      .sort({ createdAt: 1, _id: 1 })
      .project({ seq: 1 })
      .toArray();

    const alreadySequential = docs.every((d, i) => d.seq === i + 1);
    if (alreadySequential) {
      // Still make sure lastSeq is in sync.
      await pg.query('UPDATE conversations SET "lastSeq" = $1 WHERE id = $2', [
        docs.length,
        conversationId,
      ]);
      continue;
    }

    const ops = docs.map((doc, index) => ({
      updateOne: { filter: { _id: doc._id }, update: { $set: { seq: index + 1 } } },
    }));
    if (ops.length) {
      await messages.bulkWrite(ops, { ordered: true });
      updatedMessages += ops.length;
    }

    const res = await pg.query(
      'UPDATE conversations SET "lastSeq" = $1 WHERE id = $2',
      [docs.length, conversationId],
    );
    if (res.rowCount > 0) updatedConversations += 1;
  }

  console.log(
    `Backfill complete: ${updatedMessages} messages renumbered, ${updatedConversations} conversations updated.`,
  );

  await pg.end();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
