import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert quiz generator. When given document content and instructions, you generate well-structured multiple choice quiz questions in JSON format.

Always respond with ONLY a valid JSON object matching this exact structure:
{
  "title": "Quiz Title",
  "description": "Brief description of the quiz",
  "timeLimit": 30,
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct...",
      "marks": 1
    }
  ]
}

Rules:
- correctAnswer is the 0-based index of the correct option
- type is always "mcq" unless it's a True/False question, then use "true_false"
- For true_false: options must be exactly ["True", "False"]
- marks defaults to 1 unless specified
- Base ALL questions strictly on the provided document content
- Include helpful explanations citing the document`;

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prompt = formData.get("prompt") as string;
    const questionCount = parseInt(formData.get("questionCount") as string) || 10;
    const difficulty = (formData.get("difficulty") as string) || "medium";

    if (!file && !prompt) {
      return NextResponse.json({ error: "File or prompt required" }, { status: 400 });
    }

    let documentContent = "";

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (file.type === "application/pdf") {
        const uploadedFile = await openai.files.create({
          file: new File([buffer], file.name, { type: "application/pdf" }),
          purpose: "assistants",
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Generate ${questionCount} ${difficulty} difficulty quiz questions based on the provided PDF document.
${prompt ? `Additional instructions: ${prompt}` : ""}
Focus on the key concepts, facts, and important information from the document.`,
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });

        await openai.files.delete(uploadedFile.id);
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI");
        return NextResponse.json({ quiz: JSON.parse(content) });
      } else {
        documentContent = buffer.toString("utf-8");
      }
    }

    const userMessage = `${documentContent ? `Here is the document content:\n\n${documentContent.slice(0, 15000)}\n\n---\n\n` : ""}Generate ${questionCount} ${difficulty} difficulty quiz questions${documentContent ? " based ONLY on the above document" : " about the topic"}.
${prompt ? `Additional instructions: ${prompt}` : ""}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const quizData = JSON.parse(content);
    return NextResponse.json({ quiz: quizData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
