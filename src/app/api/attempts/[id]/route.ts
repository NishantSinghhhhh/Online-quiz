import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { quiz: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    // Admins can view any attempt; users only their own. Legacy rows with a
    // null userId are NOT readable by regular users — run `npm run claim:attempts`
    // to assign them before they become accessible.
    if (me.role !== "admin" && attempt.userId !== me.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
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
