import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ attempted: false });

  const attempts = await prisma.grammarAttempt.findMany({
    where: { ruleId: id, sessionId },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json({ attempted: attempts.length > 0, attempts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sessionId, wrongIds, score, total, timeTaken } = await req.json();

    const attempt = await prisma.grammarAttempt.create({
      data: {
        ruleId: id,
        sessionId,
        wrongIds: JSON.stringify(wrongIds || []),
        score,
        total,
        timeTaken,
      },
    });

    return NextResponse.json({ id: attempt.id });
  } catch {
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
