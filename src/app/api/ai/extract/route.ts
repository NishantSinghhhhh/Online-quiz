import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert at parsing and converting quiz/exam question papers into structured JSON.

Your job is to find ALL questions in the provided document and convert each one to the exact JSON format below.
Do NOT generate new questions — only extract what is already written.

Output ONLY a valid JSON object in this exact structure:
{
  "title": "Inferred title from the document",
  "description": "Brief description based on the content",
  "timeLimit": 30,
  "questions": [
    {
      "id": 1,
      "question": "Exact question text from the document",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct (infer if not given)",
      "marks": 1
    }
  ]
}

Rules:
- correctAnswer is the 0-based index of the correct option
- type is "mcq" for multiple choice, "true_false" for True/False questions
- For true_false: options must be exactly ["True", "False"]
- If an answer key is present anywhere in the document, use it for correctAnswer
- If no answer key is given, use your knowledge to determine the correct answer
- If marks/weightage are specified per question, use those values
- Estimate timeLimit as roughly 1.5 minutes per question
- Preserve the exact wording of every question and every option`;

async function tryTextExtraction(buffer: Buffer): Promise<string | null> {
  try {
    const parser = new PDFParse({ data: buffer, verbosity: -1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (parser as any).getText();
    const text = result.text as string;
    // Return null if text is empty or too short to be real content
    return text && text.trim().length >= 50 ? text : null;
  } catch {
    return null;
  }
}

async function extractViaOpenAIVision(buffer: Buffer, filename: string): Promise<string> {
  const base64 = buffer.toString("base64");

  // GPT-4o supports PDFs natively as a file content type
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
            file: {
              filename,
              file_data: `data:application/pdf;base64,${base64}`,
            },
          } as any,
          {
            type: "text",
            text: "Extract ALL questions from this PDF question paper and convert them to the required JSON format. Include every question you can find.",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content ?? "";
}

async function extractViaText(text: string): Promise<string> {
  const textToSend =
    text.length > 15000
      ? text.slice(0, 15000) + "\n\n[Document truncated at 15000 characters]"
      : text;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the text extracted from the question paper. Extract ALL questions and convert to JSON:\n\n---\n${textToSend}\n---`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let aiResponseContent = "";
    let method = "";

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // First: try fast text extraction
      const extractedText = await tryTextExtraction(buffer);

      if (extractedText) {
        // Text-based PDF — send text to GPT-4o
        method = "text";
        aiResponseContent = await extractViaText(extractedText);
      } else {
        // Scanned / image-based PDF — send raw PDF to GPT-4o vision
        method = "vision";
        aiResponseContent = await extractViaOpenAIVision(buffer, file.name);
      }
    } else {
      // Plain text / markdown file
      method = "text";
      const text = buffer.toString("utf-8");
      aiResponseContent = await extractViaText(text);
    }

    if (!aiResponseContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const quizData = JSON.parse(aiResponseContent);

    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found in this document. Make sure it contains structured MCQ questions with answer options." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      quiz: quizData,
      questionsFound: quizData.questions.length,
      method, // "text" or "vision"
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to extract questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
