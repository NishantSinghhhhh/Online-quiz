-- Enforce the "one non-retry attempt per quiz per user" rule at the DB level so
-- two concurrent POSTs can't both pass the application-side check and double-insert.
--
-- SQLite NULL semantics: NULLs are treated as distinct in UNIQUE indexes, so:
--   * legacy rows with userId IS NULL won't conflict with each other
--   * each retry-quiz creates its own quizId, so isRetry=true rows can't collide
--
-- If this migration fails, run a dedup query first, e.g.:
--   DELETE FROM "Attempt" WHERE id IN (
--     SELECT id FROM "Attempt" a WHERE rowid NOT IN (
--       SELECT MIN(rowid) FROM "Attempt" GROUP BY "userId","quizId","isRetry"
--     ) AND "userId" IS NOT NULL
--   );
CREATE UNIQUE INDEX "Attempt_userId_quizId_isRetry_key"
  ON "Attempt"("userId", "quizId", "isRetry");
