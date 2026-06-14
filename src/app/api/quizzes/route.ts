import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { isRetry: false };
    if (category && category !== "all") where.category = category;

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { attempts: true } } },
    });

    return NextResponse.json(
      quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        timeLimit: q.timeLimit,
        category: q.category,
        questionCount: JSON.parse(q.questions).length,
        attemptCount: q._count.attempts,
        createdAt: q.createdAt,
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/quizzes GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, timeLimit, questions, category, isRetry } = body;

    if (!title || !timeLimit || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || null,
        timeLimit: Number(timeLimit),
        questions: JSON.stringify(questions),
        category: category || "general",
        isRetry: isRetry || false,
      },
    });

    return NextResponse.json({ id: quiz.id, title: quiz.title }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
