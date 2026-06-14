import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.grammarRule.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, topic: true, createdAt: true },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, topic, rule, memoryTrick, examples, examTraps, questions } =
      await req.json();

    const gr = await prisma.grammarRule.create({
      data: {
        title,
        topic: topic || "general",
        rule,
        memoryTrick: memoryTrick || null,
        examples: JSON.stringify(examples || { correct: [], wrong: [] }),
        examTraps: examTraps || null,
        questions: questions ? JSON.stringify(questions) : null,
      },
    });

    return NextResponse.json({ id: gr.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save grammar rule" }, { status: 500 });
  }
}
