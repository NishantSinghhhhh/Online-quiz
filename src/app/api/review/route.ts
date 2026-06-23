import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";
import { normalizeCategoryId, type CategoryId } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attempts = await prisma.attempt.findMany({
    where: { userId: me.sub },
    include: { quiz: true },
    orderBy: { completedAt: "desc" },
  });

  const wrongQuestions: Array<{
    quizId: string;
    quizTitle: string;
    category: CategoryId;
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
    const category = normalizeCategoryId(attempt.quiz.category);

    questions.forEach((q, i) => {
      const selected = answers[i];
      const isSkipped = selected === null || selected === undefined;
      const isWrong = !isSkipped && selected !== q.correctAnswer;

      if (isWrong || isSkipped) {
        wrongQuestions.push({
          quizId: attempt.quizId,
          quizTitle: attempt.quiz.title,
          category,
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
