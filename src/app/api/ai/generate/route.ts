import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert quiz generator. When given a topic or prompt, you generate well-structured multiple choice quiz questions in JSON format.

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
- Generate at least 5 questions unless told otherwise
- Make questions clear, unambiguous, and educationally valuable
- Include helpful explanations for each answer`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, questionCount = 10, difficulty = "medium" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const userMessage = `Generate ${questionCount} ${difficulty} difficulty quiz questions about: ${prompt}

Make sure to:
- Set a reasonable timeLimit in minutes (roughly 1.5 minutes per question)
- Vary question types and difficulty within the set
- Ensure all 4 options are plausible but only one is correct`;

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

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      return NextResponse.json({ error: "Invalid quiz structure from AI" }, { status: 500 });
    }

    return NextResponse.json({ quiz: quizData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
