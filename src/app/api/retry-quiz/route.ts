import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";
import { normalizeCategoryId, getCategory, VALID_CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

// POST: create a retry quiz from wrong answers — optionally filtered to a single subject.
// Body: { subject?: CategoryId | "all" }
export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subject } = await req.json();

    const subjectFilter: CategoryId | null =
      subject && subject !== "all" && (VALID_CATEGORY_IDS as readonly string[]).includes(subject)
        ? (subject as CategoryId)
        : null;

    const attempts = await prisma.attempt.findMany({
      where: { userId: me.sub },
      include: { quiz: true },
    });

    const wrongQuestions: QuizQuestion[] = [];

    for (const attempt of attempts) {
      const cat = normalizeCategoryId(attempt.quiz.category);
      if (subjectFilter && cat !== subjectFilter) continue;

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
      const where = subjectFilter ? ` for ${getCategory(subjectFilter).label}` : "";
      return NextResponse.json({ error: `No wrong answers to practice${where}` }, { status: 400 });
    }

    const numbered = wrongQuestions.map((q, i) => ({ ...q, id: i + 1 }));
    const timeLimit = Math.max(5, Math.ceil(numbered.length * 1.5));

    const meta = subjectFilter ? getCategory(subjectFilter) : null;
    const title = meta
      ? `Practice: My Wrong ${meta.label} Answers`
      : "Practice: My Wrong Answers";
    const description = meta
      ? `Auto-generated retry quiz with ${numbered.length} ${meta.label} questions you got wrong`
      : `Auto-generated retry quiz with ${numbered.length} questions you got wrong`;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit,
        questions: JSON.stringify(numbered),
        category: subjectFilter ?? "general",
        isRetry: true,
      },
    });

    return NextResponse.json({ quizId: quiz.id, questionCount: numbered.length });
  } catch {
    return NextResponse.json({ error: "Failed to create retry quiz" }, { status: 500 });
  }
}
