import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";
import { NEGATIVE_MARK_RATIO } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

const MAX_SESSION_ID_LEN = 128;
// Allow this much extra wall-clock beyond quiz.timeLimit before rejecting (clock skew, slow upload).
const START_TIME_GRACE_S = 60;

// GET — has the current user attempted this quiz?
// sessionId param is kept for backwards compat but ignored when a user is signed in.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");
  if (!quizId) return NextResponse.json({ error: "Missing quizId" }, { status: 400 });

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ attempted: false, attemptId: null });

  const attempt = await prisma.attempt.findFirst({
    where: { userId: me.sub, quizId },
    orderBy: { completedAt: "desc" },
  });

  return NextResponse.json({ attempted: !!attempt, attemptId: attempt?.id || null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, sessionId, answers, startedAt } = body;

    if (typeof quizId !== "string" || !quizId || !answers || !startedAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > MAX_SESSION_ID_LEN) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }
    if (typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
    }

    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // isRetry is a property of the quiz, NOT something the client gets to declare.
    // Trusting client-supplied isRetry would let users bypass the one-attempt rule.
    const isRetry = quiz.isRetry;

    // Validate startedAt: must parse, must not be in the future, must not be older
    // than the quiz time limit (plus a small grace window for clock skew / upload).
    const now = new Date();
    const startTime = new Date(startedAt);
    const startMs = startTime.getTime();
    if (!Number.isFinite(startMs) || startMs > now.getTime()) {
      return NextResponse.json({ error: "Invalid startedAt" }, { status: 400 });
    }
    const elapsedS = Math.floor((now.getTime() - startMs) / 1000);
    if (elapsedS > quiz.timeLimit * 60 + START_TIME_GRACE_S) {
      return NextResponse.json({ error: "startedAt exceeds quiz time limit" }, { status: 400 });
    }

    // Block duplicates per-user for regular (non-retry) quizzes. Retry quizzes
    // are user-specific and ephemeral, so re-takes are allowed.
    if (!isRetry) {
      const existing = await prisma.attempt.findFirst({
        where: { quizId, userId: me.sub, isRetry: false },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Already attempted", attemptId: existing.id },
          { status: 409 }
        );
      }
    }

    const questions: QuizQuestion[] = JSON.parse(quiz.questions);
    // 1/3 negative marking — wrong answers deduct marks/3, skipped get 0.
    let rawScore = 0;
    const totalScore = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    questions.forEach((q, index) => {
      const selected = answers[index];
      const marks = q.marks || 1;
      if (selected === null || selected === undefined) return;
      if (selected === q.correctAnswer) rawScore += marks;
      else rawScore -= marks * NEGATIVE_MARK_RATIO;
    });

    const score = Math.max(0, Math.round(rawScore * 100) / 100);
    const timeTaken = elapsedS;

    try {
      const attempt = await prisma.attempt.create({
        data: {
          quizId,
          userId: me.sub,
          sessionId,
          answers: JSON.stringify(answers),
          score,
          totalScore,
          timeTaken,
          isRetry,
          startedAt: startTime,
        },
      });
      return NextResponse.json({ attemptId: attempt.id, score, totalScore });
    } catch (e) {
      // Lost the race against a concurrent create — surface as 409 like the pre-check would have.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const existing = await prisma.attempt.findFirst({
          where: { quizId, userId: me.sub, isRetry: false },
        });
        return NextResponse.json(
          { error: "Already attempted", attemptId: existing?.id ?? null },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (err) {
    console.error("[/api/attempts POST]", err);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
