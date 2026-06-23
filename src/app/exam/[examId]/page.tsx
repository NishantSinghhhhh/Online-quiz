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
} from "lucide-react";
import {
  EXAMS,
  sectionsForExam,
  sectionSlug,
  getExam,
  type ExamId,
} from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

export default function ExamSectionPicker({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  if (!EXAMS.some(e => e.id === examId)) notFound();

  const exam = getExam(examId);
  const sections = sectionsForExam(examId as ExamId);

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

      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Choose different exam
        </Link>

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

        <div className={`grid grid-cols-1 ${sections.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-5`}>
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={`/exam/${exam.id}/${sectionSlug(s.id)}`}
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

                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
