import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrismaClient() {
  // Honor DATABASE_URL when set (production); fall back to ./dev.db for local dev.
  // Supported forms: "file:./dev.db", "file:/abs/path/prod.db", "libsql://host?authToken=..."
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaLibSql({ url }) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
