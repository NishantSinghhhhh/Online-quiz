import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rule = await prisma.grammarRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...rule,
    examples: JSON.parse(rule.examples),
    questions: rule.questions ? JSON.parse(rule.questions) : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.grammarRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
