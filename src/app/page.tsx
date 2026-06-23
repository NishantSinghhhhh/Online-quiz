"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  BookOpen,
  Users,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Target,
  Trophy,
  ChevronLeft,
  LogOut,
  Hash,
  Award,
  ScrollText,
  GraduationCap,
  FileText,
} from "lucide-react";
import {
  EXAMS,
  SECTIONS,
  getCategory,
  getSection,
  getExam,
  sectionsForExam,
  categoriesForSection,
  type ExamId,
  type SectionId,
} from "@/lib/categories";

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

interface MeUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("quiz_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("quiz_session_id", id);
  }
  return id;
}

const ALL_CAT_TAB = { id: "all" as const, label: "All", icon: BookOpen };

export default function Home() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [attemptIds, setAttemptIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<MeUser | null>(null);

  // Three-level navigation: exam → section → quizzes
  const [activeExam, setActiveExam] = useState<ExamId | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activePaperType, setActivePaperType] = useState<"chapter" | "mock">("chapter");

  // Load user + restore last picks
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
    const savedExam = localStorage.getItem("active_exam") as ExamId | null;
    const savedSection = localStorage.getItem("active_section") as SectionId | null;
    if (savedExam && EXAMS.some(e => e.id === savedExam)) setActiveExam(savedExam);
    if (savedSection && SECTIONS.some(s => s.id === savedSection)) setActiveSection(savedSection);
  }, []);

  // Load quizzes when filters change
  useEffect(() => {
    if (!activeSection) {
      setQuizzes([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("section", activeSection);
    params.set("paperType", activePaperType);
    if (activeCategory !== "all") params.set("category", activeCategory);
    fetch(`/api/quizzes?${params.toString()}`)
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
        checks.forEach((c) => {
          map[c.id] = c.attempted;
          if (c.attemptId) idMap[c.id] = c.attemptId;
        });
        setAttempted(map);
        setAttemptIds(idMap);
      })
      .finally(() => setLoading(false));
  }, [activeSection, activeCategory, activePaperType]);

  function pickExam(id: ExamId) {
    setActiveExam(id);
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.setItem("active_exam", id);
    localStorage.removeItem("active_section");
  }

  function pickSection(id: SectionId) {
    setActiveSection(id);
    setActiveCategory("all");
    localStorage.setItem("active_section", id);
  }

  function clearExam() {
    setActiveExam(null);
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.removeItem("active_exam");
    localStorage.removeItem("active_section");
  }

  function clearSection() {
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.removeItem("active_section");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const exam = activeExam ? getExam(activeExam) : null;
  const section = activeSection ? getSection(activeSection) : null;
  const sectionCategories = activeSection ? categoriesForSection(activeSection) : [];
  const showCategoryTabs = sectionCategories.length > 1;

  const catTabs = showCategoryTabs
    ? [ALL_CAT_TAB, ...sectionCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))]
    : [];

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={clearExam} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">QuizMaster</span>
          </button>
          <div className="flex items-center gap-4">
            <Link href="/review" className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
              <Target className="w-4 h-4" /> Review Mistakes
            </Link>
            {me?.role === "admin" && (
              <Link href="/admin" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Admin <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            {me && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm">
                  {me.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{me.name}</span>
                <button onClick={logout} title="Sign out" className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── 1. No exam picked: 2 exam cards ─── */}
      {!activeExam && (
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Pick your exam
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
              {me ? `Welcome back, ${me.name.split(" ")[0]}` : "Welcome"}
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Choose which defense exam you&apos;re preparing for.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {EXAMS.map((e) => {
              const Icon = e.icon;
              return (
                <button
                  key={e.id}
                  onClick={() => pickExam(e.id)}
                  className={`relative overflow-hidden text-left rounded-3xl p-10 bg-gradient-to-br ${e.gradient} text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all group`}
                >
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                    <Icon className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold mb-1">{e.shortLabel}</h2>
                  <p className="text-sm font-medium text-white/80 mb-3">{e.fullName}</p>
                  <p className="text-sm text-white/85 mb-8 leading-relaxed">{e.tagline}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/20 px-4 py-2 rounded-lg group-hover:bg-white/30 transition-colors">
                    Start preparing <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Exam picked but no section: show section cards ─── */}
      {activeExam && !activeSection && exam && (
        <div className="max-w-6xl mx-auto px-6 py-12">
          <button
            onClick={clearExam}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Choose different exam
          </button>

          <div className={`bg-gradient-to-br ${exam.gradient} text-white rounded-3xl p-8 mb-10`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <exam.icon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{exam.fullName}</h1>
                <p className="text-sm md:text-base text-white/85 mt-1">{exam.tagline}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Choose a paper</h2>
          <p className="text-sm text-slate-500 mb-6">Each paper has its own syllabus and marking scheme.</p>

          <div className={`grid grid-cols-1 ${sectionsForExam(activeExam).length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-5`}>
            {sectionsForExam(activeExam).map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => pickSection(s.id)}
                  className={`relative text-left rounded-2xl p-6 border-2 border-slate-200 hover:border-transparent bg-white hover:bg-gradient-to-br hover:${s.gradient} hover:text-white hover:shadow-xl transition-all group`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.pillClasses} group-hover:bg-white/20 group-hover:text-white transition-colors`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-1 text-slate-900 group-hover:text-white">{s.longLabel}</h3>
                  <p className="text-sm text-slate-500 group-hover:text-white/85 leading-relaxed">{s.tagline}</p>

                  {s.blueprint && (
                    <div className="mt-5 pt-5 border-t border-slate-100 group-hover:border-white/20 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-white text-base flex items-center gap-1">
                          <Hash className="w-3 h-3" />{s.blueprint.questions}
                        </div>
                        <div className="text-slate-400 group-hover:text-white/70">Questions</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-white text-base flex items-center gap-1">
                          <Clock className="w-3 h-3" />{s.blueprint.timeLimit}m
                        </div>
                        <div className="text-slate-400 group-hover:text-white/70">Duration</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-white text-base flex items-center gap-1">
                          <Award className="w-3 h-3" />{s.blueprint.totalMarks}
                        </div>
                        <div className="text-slate-400 group-hover:text-white/70">Max marks</div>
                      </div>
                    </div>
                  )}

                  {s.blueprint && (
                    <div className="mt-3 text-xs text-emerald-700 group-hover:text-white/85 font-medium">
                      +{s.blueprint.positivePerQ} correct · −{s.blueprint.negativePerQ} wrong
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Section picked: show quizzes ─── */}
      {activeExam && activeSection && exam && section && (
        <>
          <div className={`bg-gradient-to-br ${section.gradient} text-white`}>
            <div className="max-w-6xl mx-auto px-6 py-10">
              <button
                onClick={clearSection}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {exam.shortLabel} papers
              </button>
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
            {/* CDS English: surface the dedicated learning hub (vocab / grammar / notes) */}
            {activeSection === "cds_english" && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">English Learning Hub</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link
                    href="/english/vocabulary"
                    className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                      <ScrollText className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">Vocabulary</p>
                      <p className="text-xs text-slate-500">Words · mnemonics · meanings</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                  <Link
                    href="/english/grammar"
                    className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                      <GraduationCap className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">Grammar Rules</p>
                      <p className="text-xs text-slate-500">DRR cards · examples · practice</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                  <Link
                    href="/english/notes"
                    className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md transition-all"
                  >
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

            {/* Paper type tabs */}
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

            {/* Category sub-tabs (only when section has >1 categories) */}
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
                {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse" />)}
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
                    href={`/admin/create?exam=${exam.id}&section=${activeSection}&paperType=${activePaperType}${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-4"
                  >
                    Create {activePaperType === "mock" ? "Mock Paper" : "Quiz"} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {quizzes.map((quiz) => {
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
        </>
      )}
    </div>
  );
}
