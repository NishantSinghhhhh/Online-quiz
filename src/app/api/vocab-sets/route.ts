import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const sets = await prisma.vocabSet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { words: true, attempts: true } },
      },
    });
    return NextResponse.json(
      sets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        wordCount: s._count.words,
        attemptCount: s._count.attempts,
        createdAt: s.createdAt,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch vocab sets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, description, words } = await req.json();
    if (!title || !words || !Array.isArray(words)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const set = await prisma.vocabSet.create({
      data: {
        title,
        description: description || null,
        words: {
          create: words.map((w: { word: string; meaning: string; example?: string; mnemonic?: string; tips?: string; partOfSpeech?: string }) => ({
            word: w.word,
            meaning: w.meaning,
            example: w.example || null,
            mnemonic: w.mnemonic || null,
            tips: w.tips || null,
            partOfSpeech: w.partOfSpeech || null,
          })),
        },
      },
    });

    return NextResponse.json({ id: set.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create vocab set" }, { status: 500 });
  }
}
