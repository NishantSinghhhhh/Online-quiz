import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";

// POST: create a retry quiz from wrong answers
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const attempts = await prisma.attempt.findMany({
      where: { sessionId },
      include: { quiz: true },
    });

    const wrongQuestions: QuizQuestion[] = [];

    for (const attempt of attempts) {
      const questions: QuizQuestion[] = JSON.parse(attempt.quiz.questions);
      const answers: Record<number, number | null> = JSON.parse(attempt.answers);
      questions.forEach((q, i) => {
        const selected = answers[i];
        const isWrong = selected !== null && selected !== undefined && selected !== q.correctAnswer;
        const isSkipped = selected === null || selected === undefined;
        if (isWrong || isSkipped) wrongQuestions.push(q);
      });
    }

    if (wrongQuestions.length === 0) {
      return NextResponse.json({ error: "No wrong answers to practice" }, { status: 400 });
    }

    // Re-number IDs
    const numbered = wrongQuestions.map((q, i) => ({ ...q, id: i + 1 }));
    const timeLimit = Math.max(5, Math.ceil((numbered.length * 1.5)));

    const quiz = await prisma.quiz.create({
      data: {
        title: "Practice: My Wrong Answers",
        description: `Auto-generated retry quiz with ${numbered.length} questions you got wrong`,
        timeLimit,
        questions: JSON.stringify(numbered),
        category: "general",
        isRetry: true,
      },
    });

    return NextResponse.json({ quizId: quiz.id, questionCount: numbered.length });
  } catch {
    return NextResponse.json({ error: "Failed to create retry quiz" }, { status: 500 });
  }
}
