"use client";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Users as UsersIcon,
  Plus,
  Languages,
  ScrollText,
} from "lucide-react";
import { EXAMS } from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

export default function AdminPage() {

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
            <Link
              href="/admin/users"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <UsersIcon className="w-4 h-4" /> Users
            </Link>
            <Link
              href="/stats"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Stats
            </Link>
            <Link
              href="/admin/create"
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Quiz
            </Link>
            <UserMenu variant="admin" />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-500">Pick an exam to manage its papers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {EXAMS.map(e => {
            const Icon = e.icon;
            return (
              <Link
                key={e.id}
                href={`/admin/exam/${e.id}`}
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
              </Link>
            );
          })}
        </div>

        {/* Quick content shortcuts — for things that don't belong to a single exam */}
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Content shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/admin/english"
              className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                <Languages className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">Vocab + Grammar</p>
                <p className="text-xs text-slate-500">Upload English content</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link
              href="/admin/notes"
              className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                <ScrollText className="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">1-Pager Notes</p>
                <p className="text-xs text-slate-500">Upload · AI summarise · store</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link
              href="/admin/users"
              className="group flex items-center gap-3 rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                <UsersIcon className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">Users</p>
                <p className="text-xs text-slate-500">Create · reset · delete</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
