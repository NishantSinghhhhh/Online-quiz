import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const set = await prisma.vocabSet.findUnique({
      where: { id },
      include: {
        words: { orderBy: { createdAt: "asc" } },
        _count: { select: { attempts: true } },
      },
    });
    if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(set);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.vocabSet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
