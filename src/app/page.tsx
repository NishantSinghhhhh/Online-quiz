"use client";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { EXAMS } from "@/lib/categories";
import { useMe } from "@/lib/use-me";
import { UserMenu } from "@/components/UserMenu";

export default function Home() {
  const me = useMe();

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
              <Link
                key={e.id}
                href={`/exam/${e.id}`}
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
