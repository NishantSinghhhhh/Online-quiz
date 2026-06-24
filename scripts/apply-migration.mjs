// One-off migration runner for Turso (libsql). Prisma migrate CLI doesn't
// speak libsql://, so we apply migration SQL via @libsql/client directly.
//
// Usage: node scripts/apply-migration.mjs <path-to-migration.sql>
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { createClient } from "@libsql/client";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to-migration.sql>");
  process.exit(2);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(2);
}

// libsql client takes (url, authToken) separately; our DATABASE_URL combines
// them with ?authToken=... Strip it out.
const [rawUrl, query] = url.split("?");
const authToken = query
  ? new URLSearchParams(query).get("authToken") ?? undefined
  : undefined;
const client = createClient({ url: rawUrl, authToken });

const raw = readFileSync(resolve(file), "utf8");

// Strip line comments first so they don't confuse the splitter, then split on
// semicolons. Naive but fine for hand-rolled migrations with no semicolons
// inside string literals.
const sql = raw
  .split("\n")
  .map(l => l.replace(/--.*$/, ""))
  .join("\n");

const statements = sql
  .split(/;\s*(?=\n|$)/)
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Applying ${statements.length} statement(s) from ${file}…`);
for (const [i, stmt] of statements.entries()) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
  console.log(`  [${i + 1}/${statements.length}] ${preview}${stmt.length > 90 ? "…" : ""}`);
  try {
    await client.execute(stmt);
  } catch (err) {
    console.error(`  ✗ failed:`, err.message ?? err);
    process.exit(1);
  }
}
console.log("✓ done");
