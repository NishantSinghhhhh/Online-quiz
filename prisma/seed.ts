// Seed initial users — run with `npm run seed`.
// Default passwords come from env vars (or fall back to documented defaults).
// CHANGE THESE IN PRODUCTION via .env.local before running for the first time.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

// Honor DATABASE_URL (Turso or any libsql URL). Fall back to local dev.db.
const raw = process.env.DATABASE_URL?.trim();
let url: string;
if (raw && raw.length > 0) {
  if (raw.startsWith("file:")) {
    const filePath = raw.slice("file:".length);
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    url = `file:${absolute}`;
  } else {
    url = raw;
  }
} else {
  url = `file:${path.join(process.cwd(), "dev.db")}`;
}
console.log(`Seeding into: ${url.replace(/authToken=[^&]+/, "authToken=***")}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaLibSql({ url }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

async function upsertUser(u: SeedUser) {
  const passwordHash = await bcrypt.hash(u.password, 12);
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  if (existing) {
    console.log(`✓ user already exists: ${u.email} (${u.role}) — leaving password unchanged`);
    return existing;
  }
  const created = await prisma.user.create({
    data: { name: u.name, email: u.email, passwordHash, role: u.role },
  });
  console.log(`✨ created ${u.role}: ${u.email}  password: ${u.password}`);
  return created;
}

async function main() {
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@quizmaster.local";
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeAdmin123!";
  const NISHANT_PASSWORD = process.env.SEED_NISHANT_PASSWORD ?? "ChangeMe123!";
  const VINI_PASSWORD = process.env.SEED_VINI_PASSWORD ?? "ChangeMe123!";

  const users: SeedUser[] = [
    { name: "Admin",   email: ADMIN_EMAIL,                  password: ADMIN_PASSWORD,   role: "admin" },
    { name: "Nishant", email: "nishant@quizmaster.local",   password: NISHANT_PASSWORD, role: "user" },
    { name: "Vini",    email: "vini@quizmaster.local",      password: VINI_PASSWORD,    role: "user" },
  ];

  console.log("\n── seeding users ──");
  for (const u of users) await upsertUser(u);

  console.log("\nSeed complete.");
  console.log("Sign in at /login with one of the credentials above.");
  console.log("⚠️  Change default passwords from /admin/users immediately.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
