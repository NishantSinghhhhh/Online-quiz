import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";
import { normalizeCategoryId, getCategory, VALID_CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

// Per-user rate limits for retry-quiz creation. Cheap defense against a
// scripted client spamming the endpoint to inflate the quiz table.
const RETRY_MIN_INTERVAL_MS = 60_000;          // at most 1 per minute
const RETRY_DAILY_CAP       = 10;              // at most 10 per 24h

// POST: create a retry quiz from wrong answers — optionally filtered to a single subject.
// Body: { subject?: CategoryId | "all" }
export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate-limit first so we don't burn DB work on requests we're about to reject.
    const now = Date.now();
    const since60s = new Date(now - RETRY_MIN_INTERVAL_MS);
    const since24h = new Date(now - 24 * 3600_000);
    const [recent, daily] = await Promise.all([
      prisma.quiz.count({
        where: { isRetry: true, createdById: me.sub, createdAt: { gt: since60s } },
      }),
      prisma.quiz.count({
        where: { isRetry: true, createdById: me.sub, createdAt: { gt: since24h } },
      }),
    ]);
    if (recent > 0) {
      return NextResponse.json(
        { error: "Please wait a minute before generating another practice quiz." },
        { status: 429 }
      );
    }
    if (daily >= RETRY_DAILY_CAP) {
      return NextResponse.json(
        { error: `Daily practice-quiz limit reached (${RETRY_DAILY_CAP}). Try again tomorrow.` },
        { status: 429 }
      );
    }

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
        createdById: me.sub, // attribution for the rate limiter
      },
    });

    return NextResponse.json({ quizId: quiz.id, questionCount: numbered.length });
  } catch {
    return NextResponse.json({ error: "Failed to create retry quiz" }, { status: 500 });
  }
}
