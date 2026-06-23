import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        _count: { select: { attempts: true } },
        attempts: {
          orderBy: { completedAt: "desc" },
          select: {
            id: true,
            sessionId: true,
            score: true,
            totalScore: true,
            timeTaken: true,
            completedAt: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      questions: JSON.parse(quiz.questions),
      attemptCount: quiz._count.attempts,
      attempts: quiz.attempts,
      createdAt: quiz.createdAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
