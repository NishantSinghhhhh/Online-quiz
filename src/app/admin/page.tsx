"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Users,
  Clock,
  Trash2,
  Eye,
  Sparkles,
  Award,
  BarChart3,
  ChevronLeft,
  ArrowRight,
  Hash,
  LogOut,
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
  category?: string;
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

const ALL_CAT_TAB = { id: "all" as const, label: "All", icon: BookOpen };

export default function AdminPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);

  const [activeExam, setActiveExam] = useState<ExamId | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
    const savedExam = localStorage.getItem("admin_active_exam") as ExamId | null;
    const savedSection = localStorage.getItem("admin_active_section") as SectionId | null;
    if (savedExam && EXAMS.some(e => e.id === savedExam)) setActiveExam(savedExam);
    if (savedSection && SECTIONS.some(s => s.id === savedSection)) setActiveSection(savedSection);
  }, []);

  function loadQuizzes() {
    if (!activeSection) {
      setQuizzes([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("section", activeSection);
    if (activeCategory !== "all") params.set("category", activeCategory);
    fetch(`/api/quizzes?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuizzes(data); })
      .finally(() => setLoading(false));
  }
  useEffect(loadQuizzes, [activeSection, activeCategory]);

  function pickExam(id: ExamId) {
    setActiveExam(id);
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.setItem("admin_active_exam", id);
    localStorage.removeItem("admin_active_section");
  }
  function pickSection(id: SectionId) {
    setActiveSection(id);
    setActiveCategory("all");
    localStorage.setItem("admin_active_section", id);
  }
  function clearExam() {
    setActiveExam(null);
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.removeItem("admin_active_exam");
    localStorage.removeItem("admin_active_section");
  }
  function clearSection() {
    setActiveSection(null);
    setActiveCategory("all");
    localStorage.removeItem("admin_active_section");
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    setDeleting(id);
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadQuizzes();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalAttempts = quizzes.reduce((s, q) => s + q.attemptCount, 0);
  const totalQuestions = quizzes.reduce((s, q) => s + q.questionCount, 0);

  const exam = activeExam ? getExam(activeExam) : null;
  const section = activeSection ? getSection(activeSection) : null;

  const sectionCategories = activeSection ? categoriesForSection(activeSection) : [];
  const showCategoryTabs = sectionCategories.length > 1;
  const catTabs = showCategoryTabs
    ? [ALL_CAT_TAB, ...sectionCategories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))]
    : [];

  const createHref = activeSection && activeExam
    ? `/admin/create?exam=${activeExam}&section=${activeSection}${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`
    : "/admin/create";

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={clearExam} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster Admin</span>
          </button>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Student View
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Users className="w-4 h-4" /> Users
            </Link>
            <Link
              href="/admin/stats"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Stats
            </Link>
            <Link
              href={createHref}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Quiz
            </Link>
            {me && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-sm">
                  {me.name.charAt(0).toUpperCase()}
                </div>
                <button onClick={logout} title="Sign out" className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── 1. No exam picked ─── */}
      {!activeExam && (
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
            <p className="text-slate-500">Pick an exam to manage its papers</p>
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
                    Manage papers <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Exam picked but no section: section cards ─── */}
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
                <h1 className="text-3xl md:text-4xl font-bold">{exam.fullName} — Admin</h1>
                <p className="text-sm md:text-base text-white/85 mt-1">{exam.tagline}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Choose a paper</h2>
          <p className="text-sm text-slate-500 mb-6">Manage quizzes within each paper.</p>

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
                    <div className="mt-4 flex gap-3 text-xs text-slate-500 group-hover:text-white/85">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{s.blueprint.questions}Q</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.blueprint.timeLimit}m</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{s.blueprint.totalMarks}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Section picked: quiz management ─── */}
      {activeExam && activeSection && exam && section && (
        <>
          <div className={`bg-gradient-to-br ${section.gradient} text-white`}>
            <div className="max-w-6xl mx-auto px-6 py-8">
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
              <StatCard icon={Users} color="emerald" label="Total Attempts" value={totalAttempts} />
              <StatCard icon={Award} color="violet" label="Total Questions" value={totalQuestions} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {section.longLabel} Quizzes
                  {activeCategory !== "all" && ` → ${getCategory(activeCategory).label}`}
                </h2>
                <Link
                  href={createHref}
                  className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
                >
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
                  <Link
                    href={createHref}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Create Quiz
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {quizzes.map((quiz) => {
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
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{quiz.attemptCount} attempts</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <Link
                            href={`/admin/quiz/${quiz.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
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
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
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
