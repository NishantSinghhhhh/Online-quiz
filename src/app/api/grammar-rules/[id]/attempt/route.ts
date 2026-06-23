import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_SESSION_ID_LEN = 128;
const MAX_TIME_TAKEN_S = 6 * 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ attempted: false, attempts: [] });

  const attempts = await prisma.grammarAttempt.findMany({
    where: { ruleId: id, userId: me.sub },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json({ attempted: attempts.length > 0, attempts });
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
    const { sessionId, wrongIds, timeTaken } = body;

    if (sessionId !== undefined && sessionId !== null &&
        (typeof sessionId !== "string" || sessionId.length > MAX_SESSION_ID_LEN)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const rule = await prisma.grammarRule.findUnique({ where: { id } });
    if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

    // Grammar rule questions live as JSON on the rule itself.
    const questions: unknown = rule.questions ? JSON.parse(rule.questions) : [];
    const total = Array.isArray(questions) ? questions.length : 0;

    // Filter wrongIds to valid 0-based question indices for this rule.
    const wrongArr: unknown[] = Array.isArray(wrongIds) ? wrongIds : [];
    const filteredWrong = Array.from(
      new Set(
        wrongArr.filter((n): n is number =>
          typeof n === "number" && Number.isInteger(n) && n >= 0 && n < total
        )
      )
    );

    const score = Math.max(0, total - filteredWrong.length);

    const t = typeof timeTaken === "number" && Number.isFinite(timeTaken) ? Math.floor(timeTaken) : 0;
    const safeTimeTaken = Math.max(0, Math.min(MAX_TIME_TAKEN_S, t));

    const attempt = await prisma.grammarAttempt.create({
      data: {
        ruleId: id,
        userId: me.sub,
        sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : me.sub,
        wrongIds: JSON.stringify(filteredWrong),
        score,
        total,
        timeTaken: safeTimeTaken,
      },
    });

    return NextResponse.json({ id: attempt.id, score, total });
  } catch (err) {
    console.error("[/api/grammar-rules/[id]/attempt POST]", err);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
