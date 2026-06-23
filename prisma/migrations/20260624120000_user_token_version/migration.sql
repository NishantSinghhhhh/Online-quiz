-- Per-user session invalidation counter. Bumping this value invalidates every
-- existing JWT for that user on the next server-side verify (logout-everywhere,
-- password change, role demotion).
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
