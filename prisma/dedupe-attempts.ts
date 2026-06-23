// Remove duplicate Attempt rows that violate the upcoming unique constraint
// (userId, quizId, isRetry). Keeps the OLDEST attempt for each tuple (lowest id)
// so the score history feels "first try counts".
//
// Idempotent — safe to re-run.

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const url: string = (() => {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) { console.error("DATABASE_URL not set"); process.exit(1); }
  return u;
})();

const DRY_RUN = process.env.DRY === "1";

async function main() {
  console.log(`Database: ${url.replace(/authToken=[^&"]+/, "authToken=***")}`);
  if (DRY_RUN) console.log("Mode: DRY RUN (no writes)");
  console.log();

  const client = createClient({ url });

  // SQLite NULLs are distinct in UNIQUE constraints — so we only dedupe rows
  // where userId IS NOT NULL (the constraint won't fire for legacy NULL rows).
  const dups = await client.execute(`
    SELECT "userId", "quizId", "isRetry", COUNT(*) AS n
    FROM "Attempt"
    WHERE "userId" IS NOT NULL
    GROUP BY "userId", "quizId", "isRetry"
    HAVING COUNT(*) > 1
  `);

  if (dups.rows.length === 0) {
    console.log("✓ No duplicates — safe to add the unique constraint.");
    await client.close();
    return;
  }

  console.log(`Found ${dups.rows.length} (userId, quizId, isRetry) tuples with duplicates:\n`);

  let totalToDelete = 0;
  const toDelete: string[] = [];
  for (const dup of dups.rows) {
    const r = await client.execute({
      sql: `SELECT id, "completedAt" FROM "Attempt"
            WHERE "userId" = ? AND "quizId" = ? AND "isRetry" = ?
            ORDER BY id ASC`,
      args: [dup.userId as string, dup.quizId as string, dup.isRetry as number],
    });
    const keepId = String(r.rows[0].id);
    const delIds = r.rows.slice(1).map(x => String(x.id));
    totalToDelete += delIds.length;
    toDelete.push(...delIds);
    console.log(`  quizId=${String(dup.quizId).slice(0, 12)}…  user=${String(dup.userId).slice(0, 12)}…  isRetry=${dup.isRetry}`);
    console.log(`    keep ${keepId}, drop ${delIds.length}: ${delIds.map(x => x.slice(0,8)).join(", ")}`);
  }

  console.log(`\nTotal to delete: ${totalToDelete}`);

  if (DRY_RUN) {
    console.log("(DRY RUN — no changes written)");
    await client.close();
    return;
  }

  // Delete in batches
  const BATCH = 500;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const placeholders = batch.map(() => "?").join(",");
    await client.execute({
      sql: `DELETE FROM "Attempt" WHERE id IN (${placeholders})`,
      args: batch,
    });
  }
  console.log(`✅ Deleted ${totalToDelete} duplicate rows.`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
