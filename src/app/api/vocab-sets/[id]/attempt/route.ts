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

  const attempt = await prisma.vocabAttempt.findFirst({
    where: { setId: id, sessionId },
  });
  return NextResponse.json({ attempted: !!attempt, attempt });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sessionId, wrongWordIds, score, total, timeTaken } = await req.json();

    const attempt = await prisma.vocabAttempt.create({
      data: {
        setId: id,
        sessionId,
        wrongWordIds: JSON.stringify(wrongWordIds || []),
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
