-- Quiz: track creator for /api/retry-quiz rate limiting. Nullable for
-- legacy/admin-created quizzes where attribution isn't needed.
ALTER TABLE "Quiz" ADD COLUMN "createdById" TEXT;
CREATE INDEX "Quiz_createdById_idx" ON "Quiz"("createdById");

-- QuizSession: server-stamped quiz start time so clients can't backdate
-- `startedAt` to claim impossible completion times. One open session per
-- (userId, quizId); refreshing during a quiz reuses the same row via upsert.
CREATE TABLE "QuizSession" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "quizId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "QuizSession_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuizSession_userId_quizId_key" ON "QuizSession"("userId", "quizId");
CREATE INDEX "QuizSession_expiresAt_idx" ON "QuizSession"("expiresAt");
