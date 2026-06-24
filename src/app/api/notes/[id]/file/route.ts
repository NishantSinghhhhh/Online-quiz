import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Stream the original uploaded document back to the client.
// Notes are global content (not per-user) so this is readable by any
// authenticated user — the proxy already guards /api/* with auth.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Default to attachment so arbitrary uploads can't render in-browser
  // (HTML/SVG with script content would execute on our origin). Only allow
  // inline rendering for explicitly-requested PDFs and images.
  const wantsInline = req.nextUrl.searchParams.get("inline") === "1";
  const inlineSafe = mime === "application/pdf" || mime.startsWith("image/");
  const disposition = wantsInline && inlineSafe ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": bytes.length.toString(),
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
