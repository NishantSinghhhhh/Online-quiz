-- CreateTable
CREATE TABLE "NoteSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "sections" TEXT NOT NULL,
    "sourcePages" INTEGER NOT NULL,
    "targetPages" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
