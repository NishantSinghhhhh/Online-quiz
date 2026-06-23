// Copies every row from the local SQLite (./dev.db) into the libsql/Turso
// database referenced by DATABASE_URL. Uses INSERT OR IGNORE so existing
// rows (e.g. seeded admin/nishant/vini users) are preserved.
//
// Safe to run multiple times.

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient, type Client, type InValue } from "@libsql/client";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const targetUrl: string = (() => {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) { console.error("DATABASE_URL not set"); process.exit(1); }
  if (u.startsWith("file:")) {
    console.error("DATABASE_URL points to a local file — set it to your Turso URL first.");
    process.exit(1);
  }
  return u;
})();

// Tables in dependency order (parents before children for FK constraints).
const TABLES = [
  "Quiz",
  "VocabSet",
  "GrammarRule",
  "NoteSet",
  "User",
  "Attempt",
  "VocabWord",
  "VocabAttempt",
  "GrammarAttempt",
];

async function listColumns(client: Client, table: string): Promise<string[]> {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  // PRAGMA table_info returns rows with column "name"
  return res.rows.map(r => String(r.name));
}

async function copyTable(source: Client, target: Client, table: string) {
  // Use the source's columns as the source of truth for what to read.
  const sourceCols = await listColumns(source, table);
  if (sourceCols.length === 0) {
    console.log(`⚠ ${table}: not in local db — skipping`);
    return;
  }
  const targetCols = await listColumns(target, table);
  if (targetCols.length === 0) {
    console.log(`⚠ ${table}: not in Turso — skipping`);
    return;
  }
  // Intersect — only copy columns that exist in BOTH (handles future schema drift)
  const cols = sourceCols.filter(c => targetCols.includes(c));
  const colList = cols.map(c => `"${c}"`).join(", ");
  const placeholders = cols.map(() => "?").join(", ");

  const rows = await source.execute(`SELECT ${colList} FROM "${table}"`);
  if (rows.rows.length === 0) {
    console.log(`· ${table}: empty`);
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const row of rows.rows) {
    const values: InValue[] = cols.map(c => {
      const v = (row as Record<string, unknown>)[c];
      if (v === null || v === undefined) return null;
      if (typeof v === "bigint") return v;
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (v instanceof Uint8Array) return v;
      return String(v);
    });
    const res = await target.execute({
      sql: `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders})`,
      args: values,
    });
    if (res.rowsAffected > 0) inserted += 1;
    else skipped += 1;
  }
  console.log(`✓ ${table}: ${inserted} copied, ${skipped} skipped (already in Turso)`);
}

async function main() {
  const localPath = path.join(process.cwd(), "dev.db");
  console.log(`Source: file:${localPath}`);
  console.log(`Target: ${targetUrl.replace(/authToken=[^&"]+/, "authToken=***")}\n`);

  const source = createClient({ url: `file:${localPath}` });
  const target = createClient({ url: targetUrl });

  for (const table of TABLES) {
    await copyTable(source, target, table);
  }

  console.log("\n✅ Sync complete.");
  source.close();
  target.close();
}

main().catch(e => { console.error(e); process.exit(1); });
