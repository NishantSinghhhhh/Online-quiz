// Applies every prisma/migrations/*/migration.sql against the libsql/Turso
// database referenced by DATABASE_URL — works around `prisma migrate deploy`
// not understanding `libsql://` URLs.
//
// Idempotent: tracks applied migrations in a _migrations_applied table.
// Safe to run repeatedly.

import * as fs from "fs";
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
console.log(`Migrating: ${url.replace(/authToken=[^&"]+/, "authToken=***")}`);

const client = createClient({ url });

// Split a SQL file into individual statements. Strips line comments and splits
// on `;` at statement boundaries (naive but sufficient for Prisma-generated SQL).
function splitStatements(sql: string): string[] {
  const noComments = sql
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");
  return noComments
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  // Tracking table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_migrations_applied" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  const dirs = fs.readdirSync(migrationsDir)
    .filter(d => fs.statSync(path.join(migrationsDir, d)).isDirectory())
    .sort();

  for (const name of dirs) {
    const existing = await client.execute({
      sql: 'SELECT name FROM "_migrations_applied" WHERE name = ?',
      args: [name],
    });
    if (existing.rows.length > 0) {
      console.log(`✓ already applied: ${name}`);
      continue;
    }

    const sqlPath = path.join(migrationsDir, name, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      console.log(`⚠ no migration.sql in ${name} — skipping`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    const statements = splitStatements(sql);
    console.log(`→ applying ${name} (${statements.length} statements)…`);

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Tolerate "already exists" errors so reruns don't fail
        if (/already exists|duplicate column/i.test(msg)) {
          console.log(`   (skipped: ${msg.slice(0, 80)})`);
        } else {
          throw new Error(`Failed in ${name}: ${msg}\nSQL: ${stmt.slice(0, 200)}`);
        }
      }
    }

    await client.execute({
      sql: 'INSERT INTO "_migrations_applied" (name) VALUES (?)',
      args: [name],
    });
    console.log(`✨ applied: ${name}`);
  }

  console.log("\n✅ All migrations applied.");
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
