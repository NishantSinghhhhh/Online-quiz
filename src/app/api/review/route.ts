import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const attempts = await prisma.attempt.findMany({
    where: { sessionId },
    include: { quiz: true },
    orderBy: { completedAt: "desc" },
  });

  const wrongQuestions: Array<{
    quizId: string;
    quizTitle: string;
    attemptId: string;
    completedAt: string;
    question: QuizQuestion;
    questionIndex: number;
    yourAnswer: number | null;
    correctAnswer: number;
  }> = [];

  for (const attempt of attempts) {
    const questions: QuizQuestion[] = JSON.parse(attempt.quiz.questions);
    const answers: Record<number, number | null> = JSON.parse(attempt.answers);

    questions.forEach((q, i) => {
      const selected = answers[i];
      const isSkipped = selected === null || selected === undefined;
      const isWrong = !isSkipped && selected !== q.correctAnswer;

      if (isWrong || isSkipped) {
        wrongQuestions.push({
          quizId: attempt.quizId,
          quizTitle: attempt.quiz.title,
          attemptId: attempt.id,
          completedAt: attempt.completedAt.toISOString(),
          question: q,
          questionIndex: i,
          yourAnswer: isSkipped ? null : (selected as number),
          correctAnswer: q.correctAnswer,
        });
      }
    });
  }

  return NextResponse.json({
    totalAttempts: attempts.length,
    wrongCount: wrongQuestions.length,
    questions: wrongQuestions,
  });
}
