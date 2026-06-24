import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        _count: { select: { attempts: true } },
        attempts: {
          orderBy: { completedAt: "desc" },
          select: {
            id: true,
            sessionId: true,
            score: true,
            totalScore: true,
            timeTaken: true,
            completedAt: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Non-admins must never see correctAnswer/explanation before they submit —
    // otherwise the quiz is trivially cheatable from DevTools. Admins (quiz
    // management UI) still get the full payload.
    const me = await getCurrentUser();
    const rawQuestions = JSON.parse(quiz.questions);
    const questions = me?.role === "admin"
      ? rawQuestions
      : (Array.isArray(rawQuestions) ? rawQuestions : []).map((q: Record<string, unknown>) => {
          const { correctAnswer: _ca, explanation: _ex, ...safe } = q;
          return safe;
        });

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      questions,
      attemptCount: quiz._count.attempts,
      attempts: quiz.attempts,
      createdAt: quiz.createdAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
