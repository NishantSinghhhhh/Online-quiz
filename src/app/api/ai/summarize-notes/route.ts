import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_SUBJECTS = ["english", "physics", "chemistry", "biology", "maths", "general"] as const;

const SYSTEM_PROMPT = `You are an expert note-taker who creates dense, exam-ready study notes.

Output ONLY a valid JSON object in this structure:
{
  "title": "Inferred title of the notes",
  "summary": "1-2 sentence overview of the whole document",
  "sourcePages": 30,
  "sections": [
    {
      "heading": "Section title",
      "points": [
        "Fact-rich point with **bold** key terms",
        "Another concise point"
      ]
    }
  ]
}

Rules:
- "sourcePages" = your best estimate of the input document's page count
- Produce roughly 1 page of notes (≈500 words) per 20 input pages, minimum 1 page
- Group related ideas under section headings
- Every point must be fact-dense — keep definitions, formulas, dates, names, key facts
- Drop fluff, repetition, transitional sentences, examples-of-examples
- Bold key terms by wrapping in **double asterisks**
- Use 5-10 sections maximum, with 3-8 points each`;

async function extractTextAndPages(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const parser = new PDFParse({ data: buffer, verbosity: -1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (parser as any).getText();
    const text = (result.text as string) ?? "";
    const pageCount =
      (Array.isArray(result.pages) ? result.pages.length : null) ??
      result.numpages ??
      result.total ??
      Math.max(1, Math.ceil(text.split(/\s+/).length / 500));
    return { text, pageCount };
  } catch {
    return { text: "", pageCount: 0 };
  }
}

async function summarizeViaText(text: string, pageCount: number) {
  const targetPages = Math.max(1, Math.ceil(pageCount / 20));
  const textToSend = text.length > 60000 ? text.slice(0, 60000) + "\n\n[document truncated]" : text;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Source document has ${pageCount} pages → produce ${targetPages} page(s) of dense study notes. Use sourcePages=${pageCount} in your JSON.\n\n---\n${textToSend}\n---`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function summarizeViaVision(buffer: Buffer, filename: string) {
  const base64 = buffer.toString("base64");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [
          {
            type: "file",
            file: { filename, file_data: `data:application/pdf;base64,${base64}` },
          } as any,
          {
            type: "text",
            text: "This PDF is scanned/image-based — read it visually. First count its pages and set that as sourcePages. Then produce ~1 page of dense notes per 20 input pages (minimum 1 page = ~500 words).",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawSubject = (formData.get("subject") as string | null)?.toLowerCase() ?? "general";
    const subject = (VALID_SUBJECTS as readonly string[]).includes(rawSubject) ? rawSubject : "general";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let aiContent = "";
    let detectedPages = 0;
    let method: "text" | "vision" = "text";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const { text, pageCount } = await extractTextAndPages(buffer);
      if (text && text.trim().length >= 50) {
        detectedPages = pageCount;
        aiContent = await summarizeViaText(text, pageCount);
      } else {
        method = "vision";
        aiContent = await summarizeViaVision(buffer, file.name);
      }
    } else {
      const text = buffer.toString("utf-8");
      detectedPages = Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 500));
      aiContent = await summarizeViaText(text, detectedPages);
    }

    if (!aiContent) return NextResponse.json({ error: "No AI response" }, { status: 500 });

    const data = JSON.parse(aiContent);

    if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
      return NextResponse.json({ error: "AI could not generate notes from this document" }, { status: 422 });
    }

    // Trust AI's sourcePages in vision mode; in text mode prefer our detected count
    const sourcePages = method === "vision"
      ? (Number(data.sourcePages) || 1)
      : detectedPages;
    const targetPages = Math.max(1, Math.ceil(sourcePages / 20));

    const noteSet = await prisma.noteSet.create({
      data: {
        subject,
        title: data.title || file.name.replace(/\.[^.]+$/, ""),
        summary: data.summary || null,
        sections: JSON.stringify(data.sections),
        sourcePages,
        targetPages,
      },
    });

    return NextResponse.json({
      id: noteSet.id,
      subject,
      title: noteSet.title,
      summary: data.summary || "",
      sections: data.sections,
      sourcePages,
      targetPages,
      method,
    });
  } catch (err: unknown) {
    console.error("[summarize-notes]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
