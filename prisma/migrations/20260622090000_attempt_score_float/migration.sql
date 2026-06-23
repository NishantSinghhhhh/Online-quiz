-- AlterTable: change Attempt.score and Attempt.totalScore from INTEGER to REAL (Float).
-- SQLite uses dynamic typing so the column type change is mostly metadata; values are preserved.
CREATE TABLE "new_Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "totalScore" REAL NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "isRetry" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL,
    CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Attempt" ("id","quizId","sessionId","answers","score","totalScore","timeTaken","isRetry","completedAt","startedAt")
SELECT "id","quizId","sessionId","answers", CAST("score" AS REAL), CAST("totalScore" AS REAL), "timeTaken","isRetry","completedAt","startedAt"
FROM "Attempt";
DROP TABLE "Attempt";
ALTER TABLE "new_Attempt" RENAME TO "Attempt";
