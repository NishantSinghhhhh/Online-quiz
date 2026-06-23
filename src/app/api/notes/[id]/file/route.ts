import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Stream the original uploaded document back to the client.
// Notes are global content (not per-user) so this is readable by any
// authenticated user — the proxy already guards /api/* with auth.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await prisma.noteSet.findUnique({
    where: { id },
    select: {
      originalFilename: true,
      originalContent: true,
      originalMimeType: true,
    },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!note.originalContent) {
    return NextResponse.json({ error: "Original file not stored for this note" }, { status: 404 });
  }

  const bytes = Buffer.from(note.originalContent, "base64");
  const mime = note.originalMimeType || "application/octet-stream";
  const filename = (note.originalFilename || "document").replace(/[^A-Za-z0-9._-]/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": bytes.length.toString(),
      // inline so PDFs open in the browser; ?download=1 forces download
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
