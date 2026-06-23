// Diagnostic: show attempt counts grouped by user email.

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

async function main() {
  console.log(`Database: ${url.replace(/authToken=[^&"]+/, "authToken=***")}\n`);
  const client = createClient({ url });

  for (const table of ["Attempt", "VocabAttempt", "GrammarAttempt"]) {
    console.log(`── ${table} ──`);
    const r = await client.execute(`
      SELECT
        COALESCE(u.email, '(NULL — unclaimed)') AS owner,
        COUNT(*) AS n
      FROM "${table}" t
      LEFT JOIN "User" u ON u.id = t."userId"
      GROUP BY t."userId"
      ORDER BY n DESC
    `);
    if (r.rows.length === 0) console.log("  (empty)");
    for (const row of r.rows) console.log(`  ${String(row.owner).padEnd(36)} ${String(row.n)}`);
    console.log();
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
