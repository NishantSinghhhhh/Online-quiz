"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  XCircle,
  MinusCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Search,
  Filter,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QuizQuestion } from "@/types/quiz";

interface WrongQuestion {
  quizId: string;
  quizTitle: string;
  attemptId: string;
  completedAt: string;
  question: QuizQuestion;
  questionIndex: number;
  yourAnswer: number | null;
  correctAnswer: number;
}

function getSessionId(): string {
  let id = localStorage.getItem("quiz_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("quiz_session_id", id);
  }
  return id;
}

export default function ReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterQuiz, setFilterQuiz] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "wrong" | "skipped">("all");
  const [creatingRetry, setCreatingRetry] = useState(false);

  useEffect(() => {
    const sessionId = getSessionId();
    fetch(`/api/review?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setTotalAttempts(data.totalAttempts || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateRetryQuiz() {
    setCreatingRetry(true);
    const sessionId = getSessionId();
    const res = await fetch("/api/retry-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    setCreatingRetry(false);
    if (data.quizId) router.push(`/quiz/retry?quizId=${data.quizId}`);
  }

  const uniqueQuizzes = Array.from(new Set(questions.map((q) => q.quizTitle)));

  const filtered = questions.filter((item) => {
    const matchSearch =
      !search ||
      item.question.question.toLowerCase().includes(search.toLowerCase()) ||
      item.quizTitle.toLowerCase().includes(search.toLowerCase());
    const matchQuiz = filterQuiz === "all" || item.quizTitle === filterQuiz;
    const isSkipped = item.yourAnswer === null;
    const matchType =
      filterType === "all" ||
      (filterType === "skipped" && isSkipped) ||
      (filterType === "wrong" && !isSkipped);
    return matchSearch && matchQuiz && matchType;
  });

  const wrongCount = questions.filter((q) => q.yourAnswer !== null).length;
  const skippedCount = questions.filter((q) => q.yourAnswer === null).length;

  const key = (item: WrongQuestion) => `${item.attemptId}-${item.questionIndex}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> All Quizzes
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
              <Target className="w-8 h-8 text-red-500" />
              Wrong Answers Bank
            </h1>
            <p className="text-slate-500">
              All questions you got wrong or skipped across {totalAttempts} attempt{totalAttempts !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Practice button */}
        {questions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">Ready to practice?</p>
              <p className="text-sm text-amber-700 mt-0.5">Create a quiz from your {questions.filter(q => q.yourAnswer !== null).length} wrong answers — with hints available.</p>
            </div>
            <button
              onClick={handleCreateRetryQuiz}
              disabled={creatingRetry}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors shrink-0"
            >
              {creatingRetry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
              {creatingRetry ? "Creating..." : "Practice Wrong Answers"}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-slate-900">{questions.length}</div>
            <div className="text-sm text-slate-500 mt-1">Total to review</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-red-600">{wrongCount}</div>
            <div className="text-sm text-red-500 mt-1 flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Answered wrong
            </div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-slate-500">{skippedCount}</div>
            <div className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1">
              <MinusCircle className="w-3.5 h-3.5" /> Skipped
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">All correct!</h3>
            <p className="text-slate-500 mb-6">
              You haven&apos;t made any mistakes yet. Take a quiz to start tracking your performance.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Take a Quiz
            </Link>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-48 border border-slate-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterQuiz}
                  onChange={(e) => setFilterQuiz(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">All quizzes</option>
                  {uniqueQuizzes.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>

                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  {(["all", "wrong", "skipped"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${
                        filterType === f ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-sm text-slate-400 ml-auto">
                {filtered.length} question{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Questions */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No questions match your filters</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const k = key(item);
                    const isExpanded = expandedIndex === k;
                    const isSkipped = item.yourAnswer === null;

                    return (
                      <div key={k} className="animate-fade-in">
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : k)}
                          className="w-full text-left p-6 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 shrink-0">
                              {isSkipped ? (
                                <MinusCircle className="w-5 h-5 text-slate-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                  {item.quizTitle}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(item.completedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                {isSkipped ? (
                                  <span className="text-xs text-slate-400">• Skipped</span>
                                ) : (
                                  <span className="text-xs text-red-500">• Wrong answer</span>
                                )}
                              </div>
                              <p className="text-slate-800 font-medium leading-relaxed">
                                {item.question.question}
                              </p>
                              {!isExpanded && !isSkipped && item.yourAnswer !== null && (
                                <p className="text-sm text-red-500 mt-1">
                                  You answered: {item.question.options[item.yourAnswer]}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-6 pb-6 ml-9 animate-fade-in">
                            <div className="space-y-2 mb-4">
                              {item.question.options.map((opt, oi) => {
                                const isCorrectOpt = oi === item.correctAnswer;
                                const isYourOpt = oi === item.yourAnswer;
                                return (
                                  <div
                                    key={oi}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                      isCorrectOpt
                                        ? "bg-emerald-50 border-emerald-300"
                                        : isYourOpt
                                        ? "bg-red-50 border-red-300"
                                        : "bg-slate-50 border-slate-200"
                                    }`}
                                  >
                                    <span
                                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                                        isCorrectOpt
                                          ? "bg-emerald-500 text-white"
                                          : isYourOpt
                                          ? "bg-red-400 text-white"
                                          : "bg-slate-300 text-slate-600"
                                      }`}
                                    >
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        isCorrectOpt
                                          ? "text-emerald-800 font-medium"
                                          : isYourOpt
                                          ? "text-red-700"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {opt}
                                    </span>
                                    {isCorrectOpt && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    )}
                                    {isYourOpt && !isCorrectOpt && (
                                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {isSkipped && (
                              <div className="bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-500 mb-3">
                                You skipped this question. Correct answer:{" "}
                                <strong className="text-slate-700">
                                  {item.question.options[item.correctAnswer]}
                                </strong>
                              </div>
                            )}

                            {item.question.explanation && (
                              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                                  Explanation
                                </p>
                                <p className="text-sm text-indigo-800">{item.question.explanation}</p>
                              </div>
                            )}

                            <div className="mt-3 flex justify-end">
                              <Link
                                href={`/quiz/${item.quizId}/results/${item.attemptId}`}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                View full attempt results →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
