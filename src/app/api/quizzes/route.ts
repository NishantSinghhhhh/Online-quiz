import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryId, categoriesForSection, SECTIONS, EXAMS, type SectionId } from "@/lib/categories";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const paperType = searchParams.get("paperType");
    const section = searchParams.get("section");
    const exam = searchParams.get("exam");

    const where: Record<string, unknown> = { isRetry: false };
    if (category && category !== "all") where.category = category;
    if (paperType && paperType !== "all") where.paperType = paperType;
    if (exam && exam !== "all" && EXAMS.some(e => e.id === exam)) where.exam = exam;
    // Section filter: include all categories within the requested section
    if (section && section !== "all" && SECTIONS.some(s => s.id === section)) {
      const catIds = categoriesForSection(section as SectionId).map(c => c.id);
      if (!where.category) where.category = { in: catIds };
    }

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
        category: normalizeCategoryId(q.category),
        exam: q.exam,
        paperType: q.paperType,
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
    // Admin-only: only admins create quizzes. The proxy gates /admin/* but this
    // endpoint lives under /api/quizzes (not /api/admin/*), so guard it here.
    // Retry quizzes are exempt — those are user-triggered via /api/retry-quiz
    // which calls prisma.quiz.create directly.
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, description, timeLimit, questions, category, paperType, isRetry, exam } = body;

    if (!title || !timeLimit || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || null,
        timeLimit: Number(timeLimit),
        questions: JSON.stringify(questions),
        category: normalizeCategoryId(category),
        exam: exam === "afcat" ? "afcat" : "cds",
        paperType: paperType === "mock" ? "mock" : "chapter",
        isRetry: isRetry || false,
      },
    });

    return NextResponse.json({ id: quiz.id, title: quiz.title }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
