import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { QuizQuestion } from "@/types/quiz";
import { NEGATIVE_MARK_RATIO } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

const MAX_SESSION_ID_LEN = 128;
// Allow this much extra wall-clock beyond quiz.timeLimit before rejecting (clock skew, slow upload).
const START_TIME_GRACE_S = 60;
// Server-side QuizSession ID format (cuid). Loose check to fail fast on garbage.
const QUIZ_SESSION_ID_LEN = 128;

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
    const { quizId, sessionId, quizSessionId, answers } = body;

    if (typeof quizId !== "string" || !quizId || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > MAX_SESSION_ID_LEN) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }
    if (typeof quizSessionId !== "string" || quizSessionId.length === 0 || quizSessionId.length > QUIZ_SESSION_ID_LEN) {
      return NextResponse.json({ error: "Invalid quizSessionId" }, { status: 400 });
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

    // Look up the server-stamped quiz session. Scoping to (id, userId, quizId)
    // guarantees the session belongs to this user and this quiz — a token
    // borrowed from another user/quiz won't match.
    const quizSession = await prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId: me.sub, quizId },
    });
    if (!quizSession) {
      return NextResponse.json({ error: "Invalid or expired quiz session" }, { status: 400 });
    }

    const now = new Date();
    const startTime = quizSession.startedAt;
    const elapsedS = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    if (elapsedS > quiz.timeLimit * 60 + START_TIME_GRACE_S) {
      // Session is too old — kill it so a re-start is required (and blocked for
      // non-retry quizzes since no attempt was recorded).
      await prisma.quizSession.delete({ where: { id: quizSession.id } }).catch(() => {});
      return NextResponse.json({ error: "Quiz time limit exceeded" }, { status: 400 });
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
      // Burn the session once consumed — a replay of the same quizSessionId
      // would otherwise be rejected by the unique-attempt index, but cleaning
      // up keeps the table small and makes the intent obvious.
      await prisma.quizSession.delete({ where: { id: quizSession.id } }).catch(() => {});
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
