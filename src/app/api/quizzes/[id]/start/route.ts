import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Grace window beyond quiz.timeLimit before the session is considered expired.
// Mirrors START_TIME_GRACE_S in /api/attempts so the two checks line up.
const EXPIRY_GRACE_S = 60;

// Mint (or reuse) a server-stamped quiz session. The returned sessionId is
// required by POST /api/attempts; we derive elapsedS from session.startedAt,
// so a client can no longer backdate startedAt to claim impossible times.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // For non-retry quizzes, a completed attempt blocks restart. Retry quizzes
    // are user-specific and ephemeral, so re-takes are allowed.
    if (!quiz.isRetry) {
      const existing = await prisma.attempt.findFirst({
        where: { quizId: id, userId: me.sub, isRetry: false },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Already attempted", attemptId: existing.id },
          { status: 409 }
        );
      }
    }

    // Upsert so refreshing the quiz page reuses the same session (keeping the
    // original startedAt) instead of resetting the clock.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (quiz.timeLimit * 60 + EXPIRY_GRACE_S) * 1000);
    const session = await prisma.quizSession.upsert({
      where: { userId_quizId: { userId: me.sub, quizId: id } },
      create: { quizId: id, userId: me.sub, expiresAt },
      update: {}, // keep existing startedAt + expiresAt on refresh
    });

    return NextResponse.json({
      sessionId: session.id,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("[/api/quizzes/[id]/start POST]", err);
    return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 });
  }
}
