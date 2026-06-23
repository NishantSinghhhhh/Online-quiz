import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_SESSION_ID_LEN = 128;
const MAX_TIME_TAKEN_S = 6 * 3600; // 6h cap — vocab quizzes have no enforced time limit

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ attempted: false });

  const attempt = await prisma.vocabAttempt.findFirst({
    where: { setId: id, userId: me.sub },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json({ attempted: !!attempt, attempt });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sessionId, wrongWordIds, timeTaken } = body;

    if (sessionId !== undefined && sessionId !== null &&
        (typeof sessionId !== "string" || sessionId.length > MAX_SESSION_ID_LEN)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    // Load the set's words so we can derive score/total server-side.
    // The client builds the quiz locally (random distractors) so it never sees
    // which exact "questions" exist — we trust only the wrong-word ID list.
    const set = await prisma.vocabSet.findUnique({
      where: { id },
      include: { words: { select: { id: true } } },
    });
    if (!set) return NextResponse.json({ error: "Set not found" }, { status: 404 });

    // Filter wrongWordIds to IDs that actually belong to this set, dedup.
    const validIds = new Set(set.words.map(w => w.id));
    const wrongArr: unknown[] = Array.isArray(wrongWordIds) ? wrongWordIds : [];
    const filteredWrong = Array.from(
      new Set(wrongArr.filter((x): x is string => typeof x === "string" && validIds.has(x)))
    );

    const total = set.words.length;
    const score = Math.max(0, total - filteredWrong.length);

    // Clamp timeTaken: must be a finite non-negative integer, capped at 6h.
    const t = typeof timeTaken === "number" && Number.isFinite(timeTaken) ? Math.floor(timeTaken) : 0;
    const safeTimeTaken = Math.max(0, Math.min(MAX_TIME_TAKEN_S, t));

    const attempt = await prisma.vocabAttempt.create({
      data: {
        setId: id,
        userId: me.sub,
        sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : me.sub,
        wrongWordIds: JSON.stringify(filteredWrong),
        score,
        total,
        timeTaken: safeTimeTaken,
      },
    });

    return NextResponse.json({ id: attempt.id, score, total });
  } catch (err) {
    console.error("[/api/vocab-sets/[id]/attempt POST]", err);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
