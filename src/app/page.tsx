"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, BookOpen, Users, ArrowRight, Sparkles, ChevronRight, Target, Calculator, FlaskConical, Globe } from "lucide-react";

interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questionCount: number;
  attemptCount: number;
  category: string;
  createdAt: string;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("quiz_session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("quiz_session_id", id); }
  return id;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: BookOpen, color: "indigo" },
  { id: "maths", label: "Maths", icon: Calculator, color: "blue" },
  { id: "science", label: "General Science", icon: FlaskConical, color: "emerald" },
  { id: "english", label: "English", icon: Globe, color: "violet" },
  { id: "general", label: "General", icon: BookOpen, color: "slate" },
];

const CAT_COLORS: Record<string, string> = {
  maths: "bg-blue-100 text-blue-700",
  science: "bg-emerald-100 text-emerald-700",
  english: "bg-violet-100 text-violet-700",
  general: "bg-slate-100 text-slate-600",
};

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [attemptIds, setAttemptIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    setLoading(true);
    const url = activeCategory === "all" ? "/api/quizzes" : `/api/quizzes?category=${activeCategory}`;
    fetch(url)
      .then((r) => r.json())
      .then(async (data: QuizSummary[] | { error: string }) => {
        if (!Array.isArray(data)) return;
        setQuizzes(data);
        const sessionId = getSessionId();
        const checks = await Promise.all(
          data.map((q) =>
            fetch(`/api/attempts?sessionId=${sessionId}&quizId=${q.id}`)
              .then((r) => r.json())
              .then((r) => ({ id: q.id, attempted: r.attempted, attemptId: r.attemptId }))
          )
        );
        const map: Record<string, boolean> = {};
        const idMap: Record<string, string> = {};
        checks.forEach((c) => { map[c.id] = c.attempted; if (c.attemptId) idMap[c.id] = c.attemptId; });
        setAttempted(map);
        setAttemptIds(idMap);
      })
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">QuizMaster</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/english" className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors">
              <Globe className="w-4 h-4" /> English Hub
            </Link>
            <Link href="/review" className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
              <Target className="w-4 h-4" /> Review Mistakes
            </Link>
            <Link href="/admin" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Admin <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-b from-indigo-50 to-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Quiz Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">Test Your Knowledge</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Maths, General Science, English — all in one place.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No quizzes in this category yet</h3>
            <Link href="/admin/create" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-4">
              Create Quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((quiz) => {
              const isAttempted = attempted[quiz.id];
              const catStyle = CAT_COLORS[quiz.category] || CAT_COLORS.general;
              return (
                <div key={quiz.id} className="border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${catStyle}`}>
                      {quiz.category === "science" ? "General Science" : quiz.category}
                    </span>
                    {isAttempted && (
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Completed</span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1.5">{quiz.title}</h3>
                  {quiz.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{quiz.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{quiz.questionCount} questions</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{quiz.timeLimit} min</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{quiz.attemptCount}</span>
                  </div>
                  <Link
                    href={isAttempted && attemptIds[quiz.id] ? `/quiz/${quiz.id}/results/${attemptIds[quiz.id]}` : `/quiz/${quiz.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      isAttempted ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {isAttempted ? "View Results" : "Start Quiz"} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
