"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ChevronLeft,
  Upload,
  Wand2,
  Code,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  X,
  ScanText,
} from "lucide-react";
import { QuizData, QuizQuestion } from "@/types/quiz";
import {
  CATEGORIES,
  SECTIONS,
  EXAMS,
  getCategory,
  getSection,
  getExam,
  categoriesForSection,
  type SectionId,
  type ExamId,
} from "@/lib/categories";

const EXAMPLE_JSON = `{
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics",
  "timeLimit": 20,
  "questions": [
    {
      "id": 1,
      "question": "What does 'typeof null' return in JavaScript?",
      "type": "mcq",
      "options": ["null", "undefined", "object", "string"],
      "correctAnswer": 2,
      "explanation": "typeof null returns 'object' — this is a well-known JavaScript quirk that has existed since the very first version.",
      "marks": 1
    },
    {
      "id": 2,
      "question": "Is JavaScript single-threaded?",
      "type": "true_false",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "JavaScript is single-threaded, meaning it can only execute one piece of code at a time.",
      "marks": 1
    }
  ]
}`;

type Mode = "json" | "prompt" | "upload" | "extract";

export default function CreateQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<QuizData | null>(null);

  // JSON mode
  const [jsonText, setJsonText] = useState("");

  // Prompt mode
  const [promptText, setPromptText] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");

  // Upload mode
  const [file, setFile] = useState<File | null>(null);
  const [uploadPrompt, setUploadPrompt] = useState("");
  const [uploadCount, setUploadCount] = useState(10);
  const [uploadDifficulty, setUploadDifficulty] = useState("medium");

  // Extract mode
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractInfo, setExtractInfo] = useState<{ found: number; method: string } | null>(null);
  const [extractCount, setExtractCount] = useState<string>("all");

  // Exam (afcat | cds) — locks the set of sections available
  const [exam, setExam] = useState<ExamId>("cds");
  // Section within the exam
  const [section, setSection] = useState<SectionId>("cds_gs");
  // Category within the section
  const [category, setCategory] = useState("general");
  // Paper type — chapter-wise (default) or full mock paper
  const [paperType, setPaperType] = useState<"chapter" | "mock">("chapter");

  useEffect(() => {
    const e = searchParams.get("exam");
    const s = searchParams.get("section");
    const c = searchParams.get("category");
    const p = searchParams.get("paperType");

    const examId: ExamId = e === "afcat" ? "afcat" : e === "cds" ? "cds" : "cds";
    setExam(examId);

    let sectionId: SectionId | null = null;
    if (s && SECTIONS.some(x => x.id === s)) sectionId = s as SectionId;
    if (!sectionId) {
      // Default section per exam
      sectionId = examId === "afcat" ? "afcat_general" : "cds_gs";
    }
    setSection(sectionId);

    // Pick a category that belongs to the chosen section
    const allowed = categoriesForSection(sectionId).map(x => x.id);
    if (c && allowed.includes(getCategory(c).id)) {
      setCategory(getCategory(c).id);
    } else {
      setCategory(allowed[0] ?? "general");
    }
    if (p === "mock" || p === "chapter") setPaperType(p);
  }, [searchParams]);

  function selectExam(id: ExamId) {
    setExam(id);
    const firstSection = SECTIONS.find(s => s.exam === id);
    if (firstSection) {
      setSection(firstSection.id);
      const firstCat = categoriesForSection(firstSection.id)[0];
      if (firstCat) setCategory(firstCat.id);
    }
  }

  function selectSection(id: SectionId) {
    setSection(id);
    const firstCat = categoriesForSection(id)[0];
    if (firstCat) setCategory(firstCat.id);
  }

  // Categories the user can pick from — locked to current section
  const availableCategories = categoriesForSection(section);
  const sectionMeta = getSection(section);
  const examMeta = getExam(exam);
  const sectionsForCurrentExam = SECTIONS.filter(s => s.exam === exam);

  function parseAndPreview(jsonStr: string) {
    try {
      const data = JSON.parse(jsonStr) as QuizData;
      if (!data.title || !data.questions || !Array.isArray(data.questions)) {
        setError("JSON must have 'title', 'timeLimit', and 'questions' array");
        return false;
      }
      setPreview(data);
      setError("");
      return true;
    } catch {
      setError("Invalid JSON format");
      return false;
    }
  }

  async function handleGenerateFromPrompt() {
    if (!promptText.trim()) {
      setError("Please enter a topic or prompt");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, questionCount, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setPreview(data.quiz);
      setJsonText(JSON.stringify(data.quiz, null, 2));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadGenerate() {
    if (!file) {
      setError("Please select a file");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt", uploadPrompt);
      formData.append("questionCount", String(uploadCount));
      formData.append("difficulty", uploadDifficulty);

      const res = await fetch("/api/ai/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setPreview(data.quiz);
      setJsonText(JSON.stringify(data.quiz, null, 2));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract() {
    if (!extractFile) {
      setError("Please select a PDF or text file");
      return;
    }
    setLoading(true);
    setError("");
    setExtractInfo(null);
    try {
      const formData = new FormData();
      formData.append("file", extractFile);
      if (extractCount !== "all") formData.append("limit", extractCount);

      const res = await fetch("/api/ai/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract");
      setPreview(data.quiz);
      setJsonText(JSON.stringify(data.quiz, null, 2));
      setExtractInfo({ found: data.questionsFound, method: data.method });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to extract questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuiz(quizData: QuizData) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizData.title,
          description: quizData.description,
          timeLimit: quizData.timeLimit,
          questions: quizData.questions,
          category,
          exam,
          paperType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess("Quiz saved successfully!");
      setTimeout(() => router.push("/admin"), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save quiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Quiz</h1>
        <p className="text-slate-500 mb-8">Choose how you want to create your quiz</p>

        {/* Exam picker */}
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 mb-3 bg-gradient-to-r ${examMeta.gradient} text-white`}>
          <examMeta.icon className="w-6 h-6" />
          <div className="flex-1">
            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Exam</p>
            <p className="text-lg font-bold">{examMeta.fullName}</p>
          </div>
          <div className="flex gap-1.5">
            {EXAMS.map((e) => (
              <button
                key={e.id}
                onClick={() => selectExam(e.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  exam === e.id ? "bg-white/30 text-white" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {e.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Section picker (within the exam) */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-700 shrink-0">Paper:</span>
          <div className="flex flex-wrap gap-2">
            {sectionsForCurrentExam.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSection(s.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                  section === s.id
                    ? "border-slate-900 bg-slate-900 text-white font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.longLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Category picker — only shown if section has more than 1 category */}
        {availableCategories.length > 1 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6 flex-wrap">
            <span className="text-sm font-semibold text-slate-700 shrink-0">{sectionMeta.label} Subject:</span>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${cat.outlineClasses} ${category === cat.id ? "ring-2 ring-offset-1 ring-indigo-400 font-bold" : "opacity-60 hover:opacity-100"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400">
              Selected: <strong className="text-slate-700">{getCategory(category).label}</strong>
            </span>
          </div>
        )}

        {/* Paper type picker */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6 flex-wrap">
          <span className="text-sm font-semibold text-slate-700 shrink-0">Paper Type:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPaperType("chapter")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                paperType === "chapter"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-400 ring-2 ring-offset-1 ring-indigo-200 font-bold"
                  : "bg-white text-slate-600 border-slate-200 opacity-70 hover:opacity-100"
              }`}
            >
              📘 Chapter-wise Quiz
            </button>
            <button
              onClick={() => setPaperType("mock")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                paperType === "mock"
                  ? "bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-offset-1 ring-amber-200 font-bold"
                  : "bg-white text-slate-600 border-slate-200 opacity-70 hover:opacity-100"
              }`}
            >
              🏆 Full Mock Paper
            </button>
          </div>
          <span className="ml-auto text-xs text-slate-400">
            {paperType === "mock" ? "Full-length exam-style paper" : "Topic / chapter-level quiz"}
          </span>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {([
            { id: "extract", label: "Extract from PDF", icon: ScanText, desc: "PDF already has questions — convert them to JSON" },
            { id: "prompt", label: "AI from Prompt", icon: Wand2, desc: "Describe a topic and AI generates questions" },
            { id: "upload", label: "AI from Document", icon: Upload, desc: "Upload a file and AI creates new questions from it" },
            { id: "json", label: "Manual JSON", icon: Code, desc: "Paste your own JSON question format" },
          ] as const).map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                mode === id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-indigo-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mode === id ? "bg-indigo-600" : "bg-slate-100"}`}>
                <Icon className={`w-5 h-5 ${mode === id ? "text-white" : "text-slate-500"}`} />
              </div>
              <p className="font-semibold text-slate-900 mb-1">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left panel: inputs */}
          <div className="space-y-4">
            {mode === "prompt" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-indigo-600" /> Generate from Prompt
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Topic or Prompt *</label>
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="e.g. 'World War II history', 'Python data structures', 'Human anatomy'"
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Number of Questions</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        {[5, 10, 15, 20, 25, 30].map((n) => (
                          <option key={n} value={n}>{n} questions</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateFromPrompt}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Generating..." : "Generate Quiz"}
                  </button>
                </div>
              </div>
            )}

            {mode === "upload" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" /> Generate from Document
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Upload File *</label>
                    {file ? (
                      <div className="flex items-center gap-3 border border-emerald-300 bg-emerald-50 rounded-xl px-4 py-3">
                        <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-sm text-emerald-800 flex-1 truncate">{file.name}</span>
                        <button onClick={() => setFile(null)} className="text-emerald-600 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-600">Click to upload</span>
                        <span className="text-xs text-slate-400 mt-1">PDF, TXT, MD supported</span>
                        <input
                          type="file"
                          accept=".pdf,.txt,.md,.docx"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Additional Instructions (optional)</label>
                    <textarea
                      value={uploadPrompt}
                      onChange={(e) => setUploadPrompt(e.target.value)}
                      placeholder="e.g. Focus on chapter 3, make questions about dates and events only..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Questions</label>
                      <select
                        value={uploadCount}
                        onChange={(e) => setUploadCount(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        {[5, 10, 15, 20, 25, 30].map((n) => (
                          <option key={n} value={n}>{n} questions</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Difficulty</label>
                      <select
                        value={uploadDifficulty}
                        onChange={(e) => setUploadDifficulty(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleUploadGenerate}
                    disabled={loading || !file}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Processing..." : "Generate from Document"}
                  </button>
                </div>
              </div>
            )}

            {mode === "extract" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <ScanText className="w-5 h-5 text-indigo-600" /> Extract Questions from PDF
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  Upload a PDF or text file that already has questions written in it. AI will read and convert them to the platform&apos;s JSON format — keeping the exact wording, options, and answers.
                </p>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-5 text-sm text-indigo-800">
                  <strong>Works best with:</strong> MCQ question papers, past exam papers, quiz sheets with answer keys. The PDF must have selectable text (not scanned images).
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Question Paper File *</label>
                    {extractFile ? (
                      <div className="flex items-center gap-3 border border-emerald-300 bg-emerald-50 rounded-xl px-4 py-3">
                        <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-emerald-800 truncate font-medium">{extractFile.name}</p>
                          <p className="text-xs text-emerald-600">{(extractFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => { setExtractFile(null); setExtractInfo(null); }} className="text-emerald-600 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                        <ScanText className="w-10 h-10 text-slate-400 mb-3" />
                        <span className="text-sm font-medium text-slate-600">Click to upload question paper</span>
                        <span className="text-xs text-slate-400 mt-1">PDF, TXT, MD — with selectable text</span>
                        <input
                          type="file"
                          accept=".pdf,.txt,.md"
                          className="hidden"
                          onChange={(e) => { setExtractFile(e.target.files?.[0] || null); setExtractInfo(null); }}
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">How many questions to extract?</label>
                    <select
                      value={extractCount}
                      onChange={(e) => setExtractCount(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="all">All questions in the document</option>
                      {[5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map((n) => (
                        <option key={n} value={n}>First {n} questions</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      AI will extract up to this many — order follows the document.
                    </p>
                  </div>

                  {extractInfo && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-600" />
                      Found <strong>{extractInfo.found} questions</strong>
                      <span className="ml-2 text-xs text-emerald-600">
                        via {extractInfo.method === "vision" ? "🔍 AI vision (scanned PDF)" : "📄 text extraction"}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleExtract}
                    disabled={loading || !extractFile}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                    {loading ? "Extracting questions..." : "Extract & Convert Questions"}
                  </button>
                </div>
              </div>
            )}

            {mode === "json" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-600" /> Paste JSON
                </h2>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Paste your quiz JSON below</p>
                  <button
                    onClick={() => setJsonText(EXAMPLE_JSON)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Load example
                  </button>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={EXAMPLE_JSON}
                  rows={16}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-slate-50"
                />
                <button
                  onClick={() => parseAndPreview(jsonText)}
                  className="w-full mt-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Preview Quiz
                </button>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}
          </div>

          {/* Right panel: preview */}
          <div>
            {preview ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden sticky top-24">
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Quiz Preview — Edit before saving</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategory(category).pillClasses}`}>
                        {getCategory(category).label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        paperType === "mock" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {paperType === "mock" ? "🏆 Full Mock" : "📘 Chapter"}
                      </span>
                    </div>
                    <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editable title */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Title</label>
                    <input
                      type="text"
                      value={preview.title}
                      onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                  </div>

                  {/* Editable description */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Description <span className="text-slate-300">(optional)</span></label>
                    <input
                      type="text"
                      value={preview.description ?? ""}
                      onChange={(e) => setPreview({ ...preview, description: e.target.value })}
                      placeholder="Brief description..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                  </div>

                  {/* Editable time limit */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Time Limit</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={preview.timeLimit}
                        onChange={(e) => setPreview({ ...preview, timeLimit: Math.max(1, Number(e.target.value)) })}
                        className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      />
                      <span className="text-sm text-slate-500">minutes</span>
                      <span className="ml-auto text-xs text-slate-400">
                        {preview.questions.length} questions · {preview.questions.reduce((s, q) => s + (q.marks || 1), 0)} marks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {preview.questions.map((q: QuizQuestion, i: number) => (
                    <div key={i} className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-800 mb-2">
                        <span className="text-slate-400 mr-2">Q{i + 1}.</span>
                        {q.question}
                      </p>
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => (
                          <p key={oi} className={`text-xs px-2 py-1 rounded ${oi === q.correctAnswer ? "bg-emerald-100 text-emerald-700 font-medium" : "text-slate-400"}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-slate-100">
                  <button
                    onClick={() => handleSaveQuiz(preview)}
                    disabled={loading || !preview.title.trim() || !preview.timeLimit}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? "Saving..." : "Save Quiz"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Quiz preview will appear here</p>
                <p className="text-slate-300 text-sm mt-1">Generate or preview your quiz first</p>
              </div>
            )}
          </div>
        </div>

        {/* JSON format docs */}
        <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-slate-300 text-sm">
          <p className="text-white font-semibold mb-3 flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-400" /> JSON Format Reference
          </p>
          <pre className="text-xs overflow-x-auto leading-relaxed">{`{
  "title": "string",           // Quiz title (required)
  "description": "string",     // Brief description (optional)
  "timeLimit": 30,             // Duration in minutes (required)
  "questions": [
    {
      "id": 1,                 // Unique ID (required)
      "question": "string",    // Question text (required)
      "type": "mcq",           // "mcq" or "true_false" (required)
      "options": ["A","B","C","D"],   // Answer choices (required)
      "correctAnswer": 0,      // 0-based index of correct option (required)
      "explanation": "string", // Shown after quiz (optional)
      "marks": 1               // Points for this question (default: 1)
    }
  ]
}`}</pre>
        </div>
      </div>
    </div>
  );
}
