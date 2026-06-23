// Move attempts from one user to another. By default keeps the most-recent KEEP
// attempts on the source user and moves everything older to the target.
//
// Usage (defaults — vini → nishant, keep 1 most-recent):
//   npm run move:attempts
//
// Custom:
//   FROM_EMAIL=vini@quizmaster.local TO_EMAIL=nishant@quizmaster.local KEEP=1 \
//     npm run move:attempts
//
// DRY=1 prints the plan without writing.

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient, type Client } from "@libsql/client";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const url: string = (() => {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) { console.error("DATABASE_URL not set"); process.exit(1); }
  return u;
})();

const FROM_EMAIL = (process.env.FROM_EMAIL ?? "vini@quizmaster.local").toLowerCase().trim();
const TO_EMAIL   = (process.env.TO_EMAIL   ?? "nishant@quizmaster.local").toLowerCase().trim();
const KEEP       = Math.max(0, parseInt(process.env.KEEP ?? "1", 10) || 0);
// If set, move exactly N (oldest first). Overrides KEEP.
const MOVE_COUNT = process.env.MOVE_COUNT !== undefined
  ? Math.max(0, parseInt(process.env.MOVE_COUNT, 10) || 0)
  : null;
// If set to "quiz", only act on Attempt (not vocab/grammar).
const ONLY       = (process.env.ONLY ?? "").toLowerCase().trim();
const DRY_RUN    = process.env.DRY === "1";

async function findUserId(client: Client, email: string): Promise<string> {
  const res = await client.execute({ sql: 'SELECT id FROM "User" WHERE email = ?', args: [email] });
  if (res.rows.length === 0) {
    console.error(`No user with email "${email}"`);
    process.exit(1);
  }
  return String(res.rows[0].id);
}

interface MoveResult { kept: number; moved: number; total: number }

async function moveTable(
  client: Client,
  table: string,
  fromId: string,
  toId: string,
  keep: number
): Promise<MoveResult> {
  // MOVE_COUNT mode → take the OLDEST N (so the moved attempts feel "donated").
  // Otherwise → keep newest `keep`, move the rest.
  const order = MOVE_COUNT !== null ? "ASC" : "DESC";
  const rows = await client.execute({
    sql: `SELECT id FROM "${table}" WHERE "userId" = ? ORDER BY completedAt ${order}`,
    args: [fromId],
  });
  const total = rows.rows.length;
  const idsToMove =
    MOVE_COUNT !== null
      ? rows.rows.slice(0, MOVE_COUNT).map(r => String(r.id))
      : rows.rows.slice(keep).map(r => String(r.id));

  if (idsToMove.length === 0) return { kept: total, moved: 0, total };

  if (DRY_RUN) {
    console.log(`  [${table}] would move ${idsToMove.length} of ${total} (keeping ${Math.min(keep, total)})`);
    return { kept: Math.min(keep, total), moved: idsToMove.length, total };
  }

  // Move in batches (libsql supports parameterized IN clauses up to ~999 args).
  const BATCH = 500;
  for (let i = 0; i < idsToMove.length; i += BATCH) {
    const batch = idsToMove.slice(i, i + BATCH);
    const placeholders = batch.map(() => "?").join(",");
    await client.execute({
      sql: `UPDATE "${table}" SET "userId" = ? WHERE id IN (${placeholders})`,
      args: [toId, ...batch],
    });
  }
  return { kept: Math.min(keep, total), moved: idsToMove.length, total };
}

async function main() {
  console.log(`Database: ${url.replace(/authToken=[^&"]+/, "authToken=***")}`);
  console.log(`From:     ${FROM_EMAIL}`);
  console.log(`To:       ${TO_EMAIL}`);
  console.log(`Keep:     ${KEEP} most-recent per attempt type`);
  if (DRY_RUN) console.log("Mode:     DRY RUN (no writes)\n");
  else console.log();

  const client = createClient({ url });

  const fromId = await findUserId(client, FROM_EMAIL);
  const toId   = await findUserId(client, TO_EMAIL);
  if (fromId === toId) {
    console.error("FROM and TO are the same user — nothing to do.");
    process.exit(1);
  }

  const allTables = ["Attempt", "VocabAttempt", "GrammarAttempt"];
  const tables = ONLY === "quiz" ? ["Attempt"] : allTables;
  console.log("Plan:");
  const results: Record<string, MoveResult> = {};
  for (const table of tables) {
    results[table] = await moveTable(client, table, fromId, toId, KEEP);
  }

  console.log("\nResults:");
  for (const t of tables) {
    const r = results[t];
    console.log(`  ${t}: ${r.moved} moved, ${r.kept} kept (of ${r.total} total)`);
  }

  console.log(DRY_RUN ? "\n(DRY RUN — no changes written)" : "\n✅ Done.");
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
