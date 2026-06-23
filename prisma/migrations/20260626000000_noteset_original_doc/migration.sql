-- Store the original uploaded file alongside the AI-generated 1-pager so
-- students can re-read the source. Bytes are base64-encoded into TEXT for
-- libsql/Turso portability.
ALTER TABLE "NoteSet" ADD COLUMN "originalFilename"  TEXT;
ALTER TABLE "NoteSet" ADD COLUMN "originalSizeBytes" INTEGER;
ALTER TABLE "NoteSet" ADD COLUMN "originalContent"   TEXT;
ALTER TABLE "NoteSet" ADD COLUMN "originalMimeType"  TEXT;
CREATE INDEX "NoteSet_subject_idx" ON "NoteSet"("subject");
