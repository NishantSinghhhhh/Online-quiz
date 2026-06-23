"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Sparkles,
  ChevronLeft,
  ArrowRight,
  Clock,
  Hash,
  Award,
  BarChart3,
  Users as UsersIcon,
  Plus,
} from "lucide-react";
import {
  EXAMS,
  sectionsForExam,
  sectionSlug,
  getExam,
  type ExamId,
} from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

export default function AdminExamSectionPicker({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  if (!EXAMS.some(e => e.id === examId)) notFound();

  const exam = getExam(examId);
  const sections = sectionsForExam(examId as ExamId);

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
            <Link href={`/admin/create?exam=${exam.id}`} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> New Quiz
            </Link>
            <UserMenu variant="admin" />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Choose different exam
        </Link>

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

        <div className={`grid grid-cols-1 ${sections.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-5`}>
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={`/admin/exam/${exam.id}/${sectionSlug(s.id)}`}
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
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
