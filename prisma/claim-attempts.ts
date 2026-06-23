// Assign all attempts that currently have NULL userId to the user identified
// by CLAIM_EMAIL (default: nishant@quizmaster.local).
//
// Use this once after migrating to userId-scoped attempts, so historical
// data shows up in your personal stats.
//
// Usage:
//   CLAIM_EMAIL=nishant@quizmaster.local npm run claim:attempts
//   CLAIM_EMAIL=vini@quizmaster.local    npm run claim:attempts

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const targetUrl: string = (() => {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) { console.error("DATABASE_URL not set"); process.exit(1); }
  return u;
})();

const email = (process.env.CLAIM_EMAIL ?? "nishant@quizmaster.local").toLowerCase().trim();

async function main() {
  console.log(`Database: ${targetUrl.replace(/authToken=[^&"]+/, "authToken=***")}`);
  console.log(`Claiming for: ${email}\n`);

  const client = createClient({ url: targetUrl });

  const userRow = await client.execute({
    sql: 'SELECT id FROM "User" WHERE email = ?',
    args: [email],
  });
  if (userRow.rows.length === 0) {
    console.error(`No user with email "${email}". Run \`npm run seed\` first or pick a different email.`);
    process.exit(1);
  }
  const userId = String(userRow.rows[0].id);
  console.log(`User id: ${userId}`);

  for (const table of ["Attempt", "VocabAttempt", "GrammarAttempt"]) {
    const res = await client.execute({
      sql: `UPDATE "${table}" SET "userId" = ? WHERE "userId" IS NULL`,
      args: [userId],
    });
    console.log(`✓ ${table}: ${res.rowsAffected} rows claimed`);
  }

  console.log("\n✅ Done.");
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
