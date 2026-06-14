"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  Users,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  Eye,
  BookOpen,
  TrendingUp,
} from "lucide-react";

interface AttemptSummary {
  id: string;
  sessionId: string;
  score: number;
  totalScore: number;
  timeTaken: number;
  completedAt: string;
}

interface QuizDetail {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questions: Array<{ question: string; marks?: number }>;
  attemptCount: number;
  attempts: AttemptSummary[];
  createdAt: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function AdminQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quizzes/${id}`)
      .then((r) => r.json())
      .then(setQuiz)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Quiz not found</p>
      </div>
    );
  }

  const avgScore =
    quiz.attempts.length > 0
      ? quiz.attempts.reduce((s, a) => s + (a.score / a.totalScore) * 100, 0) /
        quiz.attempts.length
      : 0;

  const avgTime =
    quiz.attempts.length > 0
      ? quiz.attempts.reduce((s, a) => s + a.timeTaken, 0) / quiz.attempts.length
      : 0;

  const passCount = quiz.attempts.filter((a) => (a.score / a.totalScore) * 100 >= 60).length;

  const totalMarks = quiz.questions.reduce((s, q) => s + (q.marks || 1), 0);

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
          <Link
            href={`/quiz/${id}`}
            target="_blank"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview Quiz
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{quiz.title}</h1>
          {quiz.description && <p className="text-slate-500">{quiz.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{quiz.questions.length} questions</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{quiz.timeLimit} min</span>
            <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4" />{totalMarks} marks</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-slate-500">Attempts</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{quiz.attemptCount}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Avg Score</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{Math.round(avgScore)}%</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">Avg Time</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{formatTime(Math.round(avgTime))}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Pass Rate</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {quiz.attempts.length > 0 ? Math.round((passCount / quiz.attempts.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Attempts table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">All Attempts</h2>
          </div>
          {quiz.attempts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Session</th>
                    <th className="text-left px-6 py-3">Score</th>
                    <th className="text-left px-6 py-3">Percentage</th>
                    <th className="text-left px-6 py-3">Time Taken</th>
                    <th className="text-left px-6 py-3">Result</th>
                    <th className="text-left px-6 py-3">Completed</th>
                    <th className="text-left px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quiz.attempts.map((attempt) => {
                    const pct = Math.round((attempt.score / attempt.totalScore) * 100);
                    const passed = pct >= 60;
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          {attempt.sessionId.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {attempt.score}/{attempt.totalScore}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                              <div
                                className={`h-full rounded-full ${passed ? "bg-emerald-500" : "bg-red-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-slate-700 font-medium">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatTime(attempt.timeTaken)}</td>
                        <td className="px-6 py-4">
                          {passed ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(attempt.completedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/quiz/${id}/results/${attempt.id}`}
                            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
