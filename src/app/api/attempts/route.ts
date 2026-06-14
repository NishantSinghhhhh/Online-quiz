import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const quizId = searchParams.get("quizId");

  if (!sessionId || !quizId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { sessionId, quizId },
  });

  return NextResponse.json({ attempted: !!attempt, attemptId: attempt?.id || null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, sessionId, answers, startedAt } = body;

    if (!quizId || !sessionId || !answers || !startedAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.attempt.findFirst({
      where: { quizId, sessionId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Already attempted", attemptId: existing.id },
        { status: 409 }
      );
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions: QuizQuestion[] = JSON.parse(quiz.questions);
    let score = 0;
    const totalScore = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    questions.forEach((q, index) => {
      const selected = answers[index];
      if (selected !== null && selected !== undefined && selected === q.correctAnswer) {
        score += q.marks || 1;
      }
    });

    const now = new Date();
    const startTime = new Date(startedAt);
    const timeTaken = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        sessionId,
        answers: JSON.stringify(answers),
        score,
        totalScore,
        timeTaken,
        startedAt: startTime,
      },
    });

    return NextResponse.json({ attemptId: attempt.id, score, totalScore });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
