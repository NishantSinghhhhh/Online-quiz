import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { quiz: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      sessionId: attempt.sessionId,
      answers: JSON.parse(attempt.answers),
      score: attempt.score,
      totalScore: attempt.totalScore,
      timeTaken: attempt.timeTaken,
      completedAt: attempt.completedAt,
      startedAt: attempt.startedAt,
      questions: JSON.parse(attempt.quiz.questions),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch attempt" }, { status: 500 });
  }
}
