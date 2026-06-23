-- Scope all attempt types to a specific user.
ALTER TABLE "Attempt" ADD COLUMN "userId" TEXT;
ALTER TABLE "VocabAttempt" ADD COLUMN "userId" TEXT;
ALTER TABLE "GrammarAttempt" ADD COLUMN "userId" TEXT;
CREATE INDEX "Attempt_userId_idx" ON "Attempt"("userId");
CREATE INDEX "VocabAttempt_userId_idx" ON "VocabAttempt"("userId");
CREATE INDEX "GrammarAttempt_userId_idx" ON "GrammarAttempt"("userId");
