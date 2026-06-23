-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeLimit" INTEGER NOT NULL,
    "questions" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "paperType" TEXT NOT NULL DEFAULT 'chapter',
    "isRetry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Quiz" ("category", "createdAt", "description", "id", "isRetry", "questions", "timeLimit", "title", "updatedAt") SELECT "category", "createdAt", "description", "id", "isRetry", "questions", "timeLimit", "title", "updatedAt" FROM "Quiz";
DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
