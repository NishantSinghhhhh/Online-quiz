import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert English grammar teacher analyzing a "Daily Rule Revision" (DRR) document.

These documents follow this structure for each grammar topic:
1. BASIC RULE — the grammatical rule
2. MEMORY TRICK — mnemonic to remember it
3. EXAMPLES — correct vs wrong usage
4. COMMON EXAM TRAP — mistakes students commonly make
5. PRACTICE QUESTIONS — MCQ questions with answer key

Extract this information and return ONLY a valid JSON object:
{
  "title": "Articles - THE - II",
  "topic": "articles",
  "rule": "Full text of the basic rule as stated in the document",
  "memoryTrick": "The memory trick text",
  "examples": {
    "correct": ["The Sun rises in the east.", "She is the best student."],
    "wrong": ["Sun rises in east.", "She is best student."]
  },
  "examTraps": "Description of common exam traps and how to avoid them",
  "questions": [
    {
      "id": 1,
      "question": "The rich (A) are often considered (B) more privileged (C) than poor. (D)",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 3,
      "explanation": "Option D is incorrect as 'the poor' requires the definite article",
      "marks": 1
    }
  ]
}

Rules for topics: use lowercase single words — "articles", "tenses", "prepositions", "conjunctions", "voices", "narration", "subject-verb-agreement", "modals", "determiners", "adjectives", "adverbs", "pronouns", "punctuation"
For practice questions: correctAnswer is the 0-based index of the correct option letter (A=0, B=1, C=2, D=3)
Extract the full answer key at the bottom of DRR documents`;

async function extractTextFromPDF(buffer: Buffer): Promise<string | null> {
  try {
    const parser = new PDFParse({ data: buffer, verbosity: -1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (parser as any).getText();
    const text = result.text as string;
    return text && text.trim().length >= 50 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let aiContent = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const text = await extractTextFromPDF(buffer);

      if (text) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Parse this DRR document into the JSON format:\n\n---\n${text}\n---` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        aiContent = completion.choices[0]?.message?.content ?? "";
      } else {
        const base64 = buffer.toString("base64");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: [
                { type: "file", file: { filename: file.name, file_data: `data:application/pdf;base64,${base64}` } } as any,
                { type: "text", text: "Parse this DRR grammar document into the required JSON format." },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        aiContent = completion.choices[0]?.message?.content ?? "";
      }
    } else {
      const text = buffer.toString("utf-8");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Parse this DRR document:\n\n---\n${text}\n---` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      aiContent = completion.choices[0]?.message?.content ?? "";
    }

    if (!aiContent) return NextResponse.json({ error: "No AI response" }, { status: 500 });

    const grammarData = JSON.parse(aiContent);

    if (!grammarData.title || !grammarData.rule) {
      return NextResponse.json({ error: "AI could not parse a grammar rule from this PDF" }, { status: 422 });
    }

    // Save to database
    const rule = await prisma.grammarRule.create({
      data: {
        title: grammarData.title,
        topic: grammarData.topic || "general",
        rule: grammarData.rule,
        memoryTrick: grammarData.memoryTrick || null,
        examples: JSON.stringify(grammarData.examples || { correct: [], wrong: [] }),
        examTraps: grammarData.examTraps || null,
        questions: grammarData.questions ? JSON.stringify(grammarData.questions) : null,
      },
    });

    const qCount = grammarData.questions?.length ?? 0;

    return NextResponse.json({
      id: rule.id,
      message: `"${rule.title}" saved successfully`,
      detail: `Topic: ${rule.topic}${qCount > 0 ? ` · ${qCount} practice questions` : ""}`,
    });
  } catch (err: unknown) {
    console.error("[extract-grammar]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
