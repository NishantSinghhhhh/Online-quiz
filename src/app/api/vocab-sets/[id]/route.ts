import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.vocabSet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
