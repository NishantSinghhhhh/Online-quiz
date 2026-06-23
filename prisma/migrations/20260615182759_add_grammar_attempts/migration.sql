-- CreateTable
CREATE TABLE "GrammarAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "wrongIds" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrammarAttempt_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "GrammarRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
