"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  BookOpen,
  Users,
  ArrowRight,
  Sparkles,
  Trophy,
  ChevronLeft,
  ScrollText,
  GraduationCap,
  FileText,
} from "lucide-react";
import {
  EXAMS,
  getCategory,
  getExam,
  findSectionBySlug,
  categoriesForSection,
  type ExamId,
} from "@/lib/categories";
import { useMe } from "@/lib/use-me";
import { UserMenu } from "@/components/UserMenu";

interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questionCount: number;
  attemptCount: number;
  category: string;
  exam?: string;
  paperType?: string;
  createdAt: string;
}

const ALL_CAT_TAB = { id: "all" as const, label: "All", icon: BookOpen };

export default function ExamQuizList({ params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  const { examId, sectionId } = use(params);
  if (!EXAMS.some(e => e.id === examId)) notFound();
  const section = findSectionBySlug(examId as ExamId, sectionId);
  if (!section) notFound();

  const exam = getExam(examId);
  const me = useMe();

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [attemptIds, setAttemptIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activePaperType, setActivePaperType] = useState<"chapter" | "mock">("chapter");

  const sectionCategories = categoriesForSection(section.id);
  const showCategoryTabs = sectionCategories.length > 1;
  const catTabs = showCategoryTabs
    ? [ALL_CAT_TAB, ...sectionCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))]
    : [];

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    sp.set("section", section.id);
    sp.set("paperType", activePaperType);
    if (activeCategory !== "all") sp.set("category", activeCategory);
    fetch(`/api/quizzes?${sp.toString()}`)
      .then(r => r.json())
      .then(async (data: QuizSummary[] | { error: string }) => {
        if (!Array.isArray(data)) return;
        setQuizzes(data);
        const checks = await Promise.all(
          data.map(q =>
            fetch(`/api/attempts?quizId=${q.id}`)
              .then(r => r.json())
              .then(r => ({ id: q.id, attempted: r.attempted, attemptId: r.attemptId }))
          )
        );
        const map: Record<string, boolean> = {};
        const idMap: Record<string, string> = {};
        checks.forEach(c => { map[c.id] = c.attempted; if (c.attemptId) idMap[c.id] = c.attemptId; });
        setAttempted(map);
        setAttemptIds(idMap);
      })
      .finally(() => setLoading(false));
  }, [section.id, activeCategory, activePaperType]);

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">QuizMaster</span>
          </Link>
          <div className="flex items-center gap-4">
            <UserMenu variant="student" />
          </div>
        </div>
      </nav>

      <div className={`bg-gradient-to-br ${section.gradient} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link
            href={`/exam/${exam.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {exam.shortLabel} papers
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <section.icon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{exam.shortLabel}</p>
              <h1 className="text-3xl md:text-4xl font-bold">{section.longLabel}</h1>
              <p className="text-sm md:text-base text-white/85">{section.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* CDS English: surface the dedicated learning hub */}
        {section.id === "cds_english" && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">English Learning Hub</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/english/vocabulary" className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                  <ScrollText className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">Vocabulary</p>
                  <p className="text-xs text-slate-500">Words · mnemonics · meanings</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link href="/english/grammar" className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                  <GraduationCap className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">Grammar Rules</p>
                  <p className="text-xs text-slate-500">DRR cards · examples · practice</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link href="/english/notes" className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                  <FileText className="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">1-Pager Notes</p>
                  <p className="text-xs text-slate-500">AI summaries · uploads</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quizzes</h2>

        <div className="flex gap-2 flex-wrap mb-6 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActivePaperType("chapter")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePaperType === "chapter" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Chapter-wise
          </button>
          <button
            onClick={() => setActivePaperType("mock")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePaperType === "mock" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Trophy className="w-4 h-4" /> Full Mock Papers
          </button>
        </div>

        {showCategoryTabs && (
          <div className="flex gap-2 flex-wrap mb-8">
            {catTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
            {activePaperType === "mock" ? <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-4" /> : <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />}
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No {activePaperType === "mock" ? "mock papers" : "quizzes"} in {section.label}
              {activeCategory !== "all" && ` → ${getCategory(activeCategory).label}`} yet
            </h3>
            {me?.role === "admin" && (
              <Link
                href={`/admin/create?exam=${exam.id}&section=${section.id}&paperType=${activePaperType}${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-4"
              >
                Create {activePaperType === "mock" ? "Mock Paper" : "Quiz"} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map(quiz => {
              const isAttempted = attempted[quiz.id];
              const cat = getCategory(quiz.category);
              return (
                <div key={quiz.id} className="border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.pillClasses}`}>
                        {cat.label}
                      </span>
                      {quiz.paperType === "mock" && (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Mock
                        </span>
                      )}
                    </div>
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
