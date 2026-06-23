import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const note = await prisma.noteSet.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: note.id,
    subject: note.subject,
    title: note.title,
    summary: note.summary,
    sections: JSON.parse(note.sections),
    sourcePages: note.sourcePages,
    targetPages: note.targetPages,
    createdAt: note.createdAt,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.noteSet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
