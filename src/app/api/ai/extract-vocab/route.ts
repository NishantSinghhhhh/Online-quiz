import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert English vocabulary teacher. Given a list of words and their meanings from a PDF, your job is to:
1. Extract every word and its meaning accurately
2. Add a memorable mnemonic/memory trick for each word
3. Add an example sentence showing the word in context
4. Add a short learning tip
5. Identify the part of speech

Output ONLY a valid JSON object:
{
  "title": "Vocabulary Set title based on content",
  "description": "Brief description",
  "words": [
    {
      "word": "Aberrant",
      "meaning": "Departing from an accepted standard; unusual or unexpected",
      "partOfSpeech": "adjective",
      "example": "His aberrant behavior alarmed his colleagues.",
      "mnemonic": "ABERRANT = AB (away) + ERRANT (wandering) → straying away from the norm",
      "tips": "Often used in formal/scientific contexts. Synonyms: deviant, anomalous, atypical"
    }
  ]
}

Rules:
- Extract EVERY word from the document, do not skip any
- Make mnemonics vivid, visual, and easy to remember
- Mnemonics can use word-breaking, rhymes, stories, or visual associations
- Tips should include synonyms, antonyms, or usage notes when helpful`;

async function extractText(buffer: Buffer, filename: string): Promise<{ text: string; method: string }> {
  if (filename.toLowerCase().endsWith(".pdf")) {
    try {
      const parser = new PDFParse({ data: buffer, verbosity: -1 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (parser as any).getText();
      const text = result.text as string;
      if (text && text.trim().length >= 20) return { text, method: "text" };
    } catch { /* fall through to vision */ }

    // Vision fallback for scanned PDFs
    const base64 = buffer.toString("base64");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [
            { type: "file", file: { filename, file_data: `data:application/pdf;base64,${base64}` } } as any,
            { type: "text", text: "Extract all vocabulary words and their meanings from this PDF and return the JSON." },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    return { text: completion.choices[0]?.message?.content ?? "", method: "vision_direct" };
  }
  return { text: buffer.toString("utf-8"), method: "text" };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { text, method } = await extractText(buffer, file.name);

    let data: { title: string; description?: string; words: { word: string; meaning: string; partOfSpeech?: string; example?: string; mnemonic?: string; tips?: string }[] };

    if (method === "vision_direct") {
      if (!text) return NextResponse.json({ error: "No response from AI" }, { status: 500 });
      data = JSON.parse(text);
    } else {
      const textToSend = text.length > 12000 ? text.slice(0, 12000) + "\n[truncated]" : text;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract all vocabulary from this document:\n\n---\n${textToSend}\n---` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });
      data = JSON.parse(content);
    }

    if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
      return NextResponse.json({ error: "AI could not extract any words from this PDF" }, { status: 422 });
    }

    // Save to database
    const vocabSet = await prisma.vocabSet.create({
      data: {
        title: data.title || file.name.replace(/\.pdf$/i, ""),
        description: data.description || null,
        words: {
          create: data.words.map((w) => ({
            word: w.word,
            meaning: w.meaning,
            partOfSpeech: w.partOfSpeech || null,
            example: w.example || null,
            mnemonic: w.mnemonic || null,
            tips: w.tips || null,
          })),
        },
      },
    });

    return NextResponse.json({
      id: vocabSet.id,
      message: `"${vocabSet.title}" saved successfully`,
      detail: `${data.words.length} words extracted · method: ${method}`,
      wordCount: data.words.length,
    });
  } catch (err: unknown) {
    console.error("[extract-vocab]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
