"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Trophy,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Target,
  RotateCcw,
} from "lucide-react";
import { QuizQuestion } from "@/types/quiz";
import { NEGATIVE_MARK_RATIO } from "@/lib/categories";

interface AttemptResult {
  id: string;
  quizId: string;
  quizTitle: string;
  answers: Record<number, number | null>;
  score: number;
  totalScore: number;
  timeTaken: number;
  completedAt: string;
  startedAt: string;
  questions: QuizQuestion[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getGrade(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "Excellent!", color: "text-emerald-600" };
  if (pct >= 75) return { label: "Great job!", color: "text-blue-600" };
  if (pct >= 60) return { label: "Good effort", color: "text-indigo-600" };
  if (pct >= 40) return { label: "Keep practicing", color: "text-amber-600" };
  return { label: "Needs improvement", color: "text-red-600" };
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = use(params);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Result not found.</p>
      </div>
    );
  }

  const pct = Math.round((result.score / result.totalScore) * 100);
  const grade = getGrade(pct);

  const stats = result.questions.reduce(
    (acc, q, i) => {
      const selected = result.answers[i];
      const marks = q.marks || 1;
      if (selected === null || selected === undefined) acc.skipped++;
      else if (selected === q.correctAnswer) {
        acc.correct++;
        acc.gained += marks;
      } else {
        acc.wrong++;
        acc.penalty += marks * NEGATIVE_MARK_RATIO;
      }
      return acc;
    },
    { correct: 0, wrong: 0, skipped: 0, gained: 0, penalty: 0 }
  );

  const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(2));

  const wrongQuestions = result.questions.filter((q, i) => {
    const selected = result.answers[i];
    return selected !== null && selected !== undefined && selected !== q.correctAnswer;
  });

  const filteredQuestions = result.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => {
      const selected = result.answers[i];
      if (filter === "correct") return selected === q.correctAnswer;
      if (filter === "wrong")
        return selected !== null && selected !== undefined && selected !== q.correctAnswer;
      if (filter === "skipped") return selected === null || selected === undefined;
      return true;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> All Quizzes
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Score card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-6 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-4">
            <Trophy className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{result.quizTitle}</h1>
          <p className={`text-lg font-semibold mb-6 ${grade.color}`}>{grade.label}</p>

          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-6xl font-bold text-slate-900">{fmt(result.score)}</span>
            <span className="text-3xl text-slate-300 font-light">/</span>
            <span className="text-3xl text-slate-400 font-medium">{fmt(result.totalScore)}</span>
          </div>

          {/* Negative-marking breakdown */}
          {stats.penalty > 0 && (
            <div className="flex items-center justify-center gap-4 mb-6 text-sm">
              <span className="text-emerald-600">+{fmt(stats.gained)} earned</span>
              <span className="text-red-500">−{fmt(stats.penalty)} penalty</span>
              <span className="text-slate-400 text-xs px-2 py-0.5 bg-slate-100 rounded-full">
                ⅓ negative marking
              </span>
            </div>
          )}

          {/* Score ring */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={pct >= 60 ? "#4f46e5" : pct >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{pct}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.correct}</div>
              <div className="text-xs text-emerald-600">Correct</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center justify-center mb-1">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
              <div className="text-xs text-red-500">Wrong</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-center mb-1">
                <MinusCircle className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-600">{stats.skipped}</div>
              <div className="text-xs text-slate-400">Skipped</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{formatTime(result.timeTaken)}</div>
              <div className="text-xs text-blue-500">Time Taken</div>
            </div>
          </div>
        </div>

        {/* Wrong answers summary */}
        {wrongQuestions.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Topics to review ({wrongQuestions.length} questions)</h3>
            </div>
            <div className="space-y-1">
              {wrongQuestions.map((q, idx) => (
                <p key={idx} className="text-sm text-red-700">• {q.question.length > 80 ? q.question.slice(0, 80) + "..." : q.question}</p>
              ))}
            </div>
          </div>
        )}

        {/* Detailed review */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-bold text-slate-900">Detailed Review</h2>
            <div className="flex gap-2">
              {(["all", "correct", "wrong", "skipped"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                  {f !== "all" && (
                    <span className="ml-1 text-xs">
                      ({f === "correct" ? stats.correct : f === "wrong" ? stats.wrong : stats.skipped})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredQuestions.map(({ q, i }) => {
              const selected = result.answers[i];
              const isCorrect = selected === q.correctAnswer;
              const isSkipped = selected === null || selected === undefined;
              const isExpanded = expandedIndex === i;

              return (
                <div key={i} className="p-6">
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 shrink-0">
                        {isSkipped ? (
                          <MinusCircle className="w-5 h-5 text-slate-400" />
                        ) : isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-400">Q{i + 1}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className={`text-xs font-medium ${
                            isSkipped ? "text-slate-400" : isCorrect ? "text-emerald-600" : "text-red-600"
                          }`}>
                            {isSkipped ? "Skipped" : isCorrect ? `+${q.marks || 1}` : "0 marks"}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium">{q.question}</p>
                        {!isExpanded && !isSkipped && (
                          <p className={`text-sm mt-1 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                            Your answer: {q.options[selected as number]}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 ml-9 animate-fade-in">
                      <div className="space-y-2 mb-4">
                        {q.options.map((opt, oi) => {
                          const isCorrectOpt = oi === q.correctAnswer;
                          const isSelectedOpt = oi === selected;
                          return (
                            <div
                              key={oi}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                isCorrectOpt
                                  ? "bg-emerald-50 border-emerald-300"
                                  : isSelectedOpt && !isCorrectOpt
                                  ? "bg-red-50 border-red-300"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                                isCorrectOpt ? "bg-emerald-500 text-white" : isSelectedOpt ? "bg-red-400 text-white" : "bg-slate-300 text-slate-600"
                              }`}>
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className={`text-sm flex-1 ${isCorrectOpt ? "text-emerald-800 font-medium" : isSelectedOpt ? "text-red-700" : "text-slate-600"}`}>
                                {opt}
                              </span>
                              {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                      {isSkipped && (
                        <div className="bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-500 mb-3">
                          You skipped this question. Correct answer: <strong className="text-slate-700">{q.options[q.correctAnswer]}</strong>
                        </div>
                      )}
                      {q.explanation && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Explanation</p>
                          <p className="text-sm text-indigo-800">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link
            href="/review"
            className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Review All Mistakes
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Take Another Quiz <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
