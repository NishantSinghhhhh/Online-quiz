"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  Clock,
  Trash2,
  Eye,
  Sparkles,
  TrendingUp,
  Award,
  GraduationCap,
} from "lucide-react";

interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
}

export default function AdminPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadQuizzes = () => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuizzes(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    setDeleting(id);
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadQuizzes();
  }

  const totalAttempts = quizzes.reduce((s, q) => s + q.attemptCount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Student View
            </Link>
            <Link
              href="/admin/english"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <GraduationCap className="w-4 h-4" /> English Content
            </Link>
            <Link
              href="/admin/create"
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Quiz
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Admin Dashboard</h1>
          <p className="text-slate-500">Manage your quizzes and track performance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Quizzes</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{quizzes.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Attempts</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalAttempts}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Questions</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {quizzes.reduce((s, q) => s + q.questionCount, 0)}
            </div>
          </div>
        </div>

        {/* Quiz list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Quizzes</h2>
            <Link
              href="/admin/create"
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
              <p className="text-slate-500 mb-4">No quizzes yet. Create your first one!</p>
              <Link
                href="/admin/create"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Quiz
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{quiz.title}</p>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
