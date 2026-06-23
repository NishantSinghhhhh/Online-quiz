"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Plus,
  Users as UsersIcon,
  Clock,
  Trash2,
  Eye,
  Sparkles,
  Award,
  BarChart3,
  ChevronLeft,
} from "lucide-react";
import {
  EXAMS,
  getCategory,
  getExam,
  findSectionBySlug,
  categoriesForSection,
  type ExamId,
} from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questionCount: number;
  attemptCount: number;
  category?: string;
  exam?: string;
  paperType?: string;
  createdAt: string;
}

const ALL_CAT_TAB = { id: "all" as const, label: "All", icon: BookOpen };

export default function AdminExamQuizList({ params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  const { examId, sectionId } = use(params);
  if (!EXAMS.some(e => e.id === examId)) notFound();
  const section = findSectionBySlug(examId as ExamId, sectionId);
  if (!section) notFound();

  const exam = getExam(examId);
  const sectionDbId = section.id; // freeze for closures (TS can't narrow through them)

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const sectionCategories = categoriesForSection(sectionDbId);
  const showCategoryTabs = sectionCategories.length > 1;
  const catTabs = showCategoryTabs
    ? [ALL_CAT_TAB, ...sectionCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))]
    : [];

  function loadQuizzes() {
    setLoading(true);
    const sp = new URLSearchParams();
    sp.set("section", sectionDbId);
    if (activeCategory !== "all") sp.set("category", activeCategory);
    fetch(`/api/quizzes?${sp.toString()}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setQuizzes(data); })
      .finally(() => setLoading(false));
  }
  useEffect(loadQuizzes, [sectionDbId, activeCategory]);

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    setDeleting(id);
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadQuizzes();
  }

  const totalAttempts = quizzes.reduce((s, q) => s + q.attemptCount, 0);
  const totalQuestions = quizzes.reduce((s, q) => s + q.questionCount, 0);
  const createHref = `/admin/create?exam=${exam.id}&section=${section.id}${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Student View</Link>
            <Link href="/admin/users" className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <UsersIcon className="w-4 h-4" /> Users
            </Link>
            <Link href="/stats" className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <BarChart3 className="w-4 h-4" /> Stats
            </Link>
            <Link href={createHref} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> New Quiz
            </Link>
            <UserMenu variant="admin" />
          </div>
        </div>
      </nav>

      <div className={`bg-gradient-to-br ${section.gradient} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href={`/admin/exam/${exam.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> {exam.shortLabel} papers
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <section.icon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{exam.shortLabel} · Admin</p>
              <h1 className="text-3xl font-bold">{section.longLabel}</h1>
              <p className="text-sm md:text-base text-white/85">{section.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {showCategoryTabs && (
          <div className="flex gap-2 flex-wrap mb-6">
            {catTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon={BookOpen} color="indigo" label={`${section.label} Quizzes`} value={quizzes.length} />
          <StatCard icon={UsersIcon} color="emerald" label="Total Attempts" value={totalAttempts} />
          <StatCard icon={Award} color="violet" label="Total Questions" value={totalQuestions} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {section.longLabel} Quizzes
              {activeCategory !== "all" && ` → ${getCategory(activeCategory).label}`}
            </h2>
            <Link href={createHref} className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Quiz
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="p-16 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No quizzes here yet.</p>
              <Link href={createHref} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" /> Create Quiz
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map(quiz => {
                const cat = getCategory(quiz.category);
                return (
                  <div key={quiz.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">{quiz.title}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cat.pillClasses}`}>
                            {cat.label}
                          </span>
                          {quiz.paperType === "mock" && (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                              🏆 MOCK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{quiz.questionCount} questions</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.timeLimit} min</span>
                          <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{quiz.attemptCount} attempts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Link href={`/admin/quiz/${quiz.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                        <Eye className="w-4 h-4" /> View
                      </Link>
                      <button
                        onClick={() => deleteQuiz(quiz.id)}
                        disabled={deleting === quiz.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting === quiz.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, color, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "indigo" | "emerald" | "violet";
  label: string;
  value: number;
}) {
  const colorMap = {
    indigo: { bg: "bg-indigo-100", fg: "text-indigo-600" },
    emerald: { bg: "bg-emerald-100", fg: "text-emerald-600" },
    violet: { bg: "bg-violet-100", fg: "text-violet-600" },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.fg}`} />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
