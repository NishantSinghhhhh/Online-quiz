"use client";

import { useEffect, useMemo, useState } from "react";
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
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QuizQuestion } from "@/types/quiz";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/categories";

interface WrongQuestion {
  quizId: string;
  quizTitle: string;
  category: CategoryId;
  attemptId: string;
  completedAt: string;
  question: QuizQuestion;
  questionIndex: number;
  yourAnswer: number | null;
  correctAnswer: number;
}

type SubjectTab = CategoryId | "all";

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
  const [subjectTab, setSubjectTab] = useState<SubjectTab>("all");
  const [filterType, setFilterType] = useState<"all" | "wrong" | "skipped">("all");
  const [creatingRetry, setCreatingRetry] = useState<SubjectTab | null>(null);

  useEffect(() => {
    fetch(`/api/review`)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setTotalAttempts(data.totalAttempts || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Per-subject counts (always computed across the full set) ─
  const countsBySubject = useMemo(() => {
    const map: Record<string, { total: number; wrong: number; skipped: number }> = {};
    for (const q of questions) {
      const key = q.category;
      if (!map[key]) map[key] = { total: 0, wrong: 0, skipped: 0 };
      map[key].total += 1;
      if (q.yourAnswer === null) map[key].skipped += 1;
      else map[key].wrong += 1;
    }
    return map;
  }, [questions]);

  // Subjects that actually have wrong/skipped questions
  const activeSubjects = useMemo(
    () => CATEGORIES.filter((c) => countsBySubject[c.id]?.total > 0),
    [countsBySubject]
  );

  async function handleCreateRetryQuiz(subject: SubjectTab) {
    setCreatingRetry(subject);
    const res = await fetch("/api/retry-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });
    const data = await res.json();
    setCreatingRetry(null);
    if (data.quizId) router.push(`/quiz/retry?quizId=${data.quizId}`);
  }

  const filtered = questions.filter((item) => {
    const matchSubject = subjectTab === "all" || item.category === subjectTab;
    const matchSearch =
      !search ||
      item.question.question.toLowerCase().includes(search.toLowerCase()) ||
      item.quizTitle.toLowerCase().includes(search.toLowerCase());
    const isSkipped = item.yourAnswer === null;
    const matchType =
      filterType === "all" ||
      (filterType === "skipped" && isSkipped) ||
      (filterType === "wrong" && !isSkipped);
    return matchSubject && matchSearch && matchType;
  });

  // Counts for the currently-selected subject tab
  const currentCount = subjectTab === "all"
    ? { total: questions.length, wrong: questions.filter((q) => q.yourAnswer !== null).length, skipped: questions.filter((q) => q.yourAnswer === null).length }
    : (countsBySubject[subjectTab] ?? { total: 0, wrong: 0, skipped: 0 });

  const currentMeta = subjectTab === "all" ? null : getCategory(subjectTab);

  const key = (item: WrongQuestion) => `${item.attemptId}-${item.questionIndex}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
            <Target className="w-8 h-8 text-red-500" />
            Wrong Answers Bank
          </h1>
          <p className="text-slate-500">
            All questions you got wrong or skipped across {totalAttempts} attempt{totalAttempts !== 1 ? "s" : ""}
          </p>
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
            {/* Subject tabs */}
            <div className="flex gap-2 flex-wrap mb-6">
              <SubjectTabButton
                active={subjectTab === "all"}
                onClick={() => setSubjectTab("all")}
                label="All Subjects"
                count={questions.length}
                color="indigo"
              />
              {activeSubjects.map((cat) => {
                const c = countsBySubject[cat.id];
                return (
                  <SubjectTabButton
                    key={cat.id}
                    active={subjectTab === cat.id}
                    onClick={() => setSubjectTab(cat.id)}
                    label={cat.label}
                    count={c.total}
                    pillClasses={cat.pillClasses}
                  />
                );
              })}
            </div>

            {/* Practice CTA for current tab */}
            {currentCount.total > 0 && (
              <div className={`rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 border ${
                currentMeta
                  ? `${currentMeta.pillClasses} border-current/20`
                  : "bg-amber-50 border-amber-200"
              }`}>
                <div>
                  <p className="font-semibold">
                    {currentMeta ? `Practice ${currentMeta.label}` : "Ready to practice?"}
                  </p>
                  <p className="text-sm mt-0.5 opacity-90">
                    Create a quiz from your <strong>{currentCount.total}</strong>{" "}
                    {currentMeta ? `${currentMeta.label.toLowerCase()} ` : ""}wrong question{currentCount.total !== 1 ? "s" : ""}.
                    {currentCount.wrong > 0 && currentCount.skipped > 0 && ` (${currentCount.wrong} wrong · ${currentCount.skipped} skipped)`}
                  </p>
                </div>
                <button
                  onClick={() => handleCreateRetryQuiz(subjectTab)}
                  disabled={creatingRetry !== null}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white disabled:opacity-60 transition-colors shrink-0 ${
                    currentMeta ? "bg-slate-900 hover:bg-slate-800" : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {creatingRetry === subjectTab ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  {creatingRetry === subjectTab ? "Creating..." : "Practice Now"}
                </button>
              </div>
            )}

            {/* Per-subject summary cards (only shown on "All" tab) */}
            {subjectTab === "all" && activeSubjects.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {activeSubjects.map((cat) => {
                  const c = countsBySubject[cat.id];
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.pillClasses}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{cat.label}</p>
                        <p className="text-xs text-slate-500">
                          {c.total} wrong{c.skipped > 0 ? ` (${c.skipped} skipped)` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateRetryQuiz(cat.id)}
                        disabled={creatingRetry !== null}
                        className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 shrink-0 flex items-center gap-1"
                        title={`Practice ${c.total} wrong ${cat.label} questions`}
                      >
                        {creatingRetry === cat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                        Practice
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stat counts for current tab */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-slate-900">{currentCount.total}</div>
                <div className="text-sm text-slate-500 mt-1">Total to review</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-red-600">{currentCount.wrong}</div>
                <div className="text-sm text-red-500 mt-1 flex items-center justify-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Answered wrong
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-slate-500">{currentCount.skipped}</div>
                <div className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <MinusCircle className="w-3.5 h-3.5" /> Skipped
                </div>
              </div>
            </div>

            {/* Search + wrong/skipped filter */}
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
                    const itemCat = getCategory(item.category);

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
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${itemCat.pillClasses}`}>
                                  {itemCat.label}
                                </span>
                                <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
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

function SubjectTabButton({
  active,
  onClick,
  label,
  count,
  color,
  pillClasses,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: "indigo";
  pillClasses?: string;
}) {
  const activeClasses = color === "indigo"
    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
    : "bg-slate-900 text-white border-slate-900 shadow-sm";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
        active ? activeClasses : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          active ? "bg-white/20 text-white" : pillClasses ?? "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
