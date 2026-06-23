"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  FileText,
  Clock,
  Download,
  Eye,
  ScrollText,
  BookOpen,
} from "lucide-react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

interface NoteListItem {
  id: string;
  subject: string;
  title: string;
  summary: string | null;
  sourcePages: number;
  targetPages: number;
  originalFilename: string | null;
  originalSizeBytes: number | null;
  createdAt: string;
}

const ALL_FILTER = { id: "all", label: "All Subjects" } as const;

function bytesHuman(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function NotesIndexPage() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    const url = subject === "all" ? "/api/notes" : `/api/notes?subject=${subject}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNotes(data); })
      .finally(() => setLoading(false));
  }, [subject]);

  // Only show subject pills that actually have notes
  const subjectsWithNotes = Array.from(new Set(notes.map(n => n.subject)));

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <UserMenu variant="student" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">1-Pager Notes</h1>
            <p className="text-slate-500">AI summaries — read or download the original PDF</p>
          </div>
        </div>

        {/* Subject filter */}
        <div className="flex gap-2 flex-wrap my-6">
          <button
            onClick={() => setSubject(ALL_FILTER.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              subject === ALL_FILTER.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <BookOpen className="w-4 h-4" /> {ALL_FILTER.label}
            <span className={`ml-1 text-xs font-semibold ${
              subject === ALL_FILTER.id ? "text-white/80" : "text-slate-400"
            }`}>({notes.length})</span>
          </button>
          {CATEGORIES.filter(c => subjectsWithNotes.includes(c.id)).map(c => {
            const Icon = c.icon;
            const count = notes.filter(n => n.subject === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSubject(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  subject === c.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : `${c.pillClasses} border border-transparent hover:opacity-90`
                }`}
              >
                <Icon className="w-4 h-4" /> {c.label}
                <span className={`ml-1 text-xs font-semibold ${
                  subject === c.id ? "text-white/80" : "opacity-70"
                }`}>({count})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {subject === "all" ? "No notes yet" : `No notes in ${getCategory(subject).label} yet`}
            </h3>
            <p className="text-slate-500 mb-4 text-sm">Notes are generated from PDFs your admin uploads.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map(n => {
              const cat = getCategory(n.subject);
              return (
                <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${cat.pillClasses}`}>
                        <cat.icon className="w-3 h-3" /> {cat.label}
                      </span>
                      <h3 className="font-bold text-slate-900 leading-snug">{n.title}</h3>
                      {n.summary && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{n.summary}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{n.sourcePages} → {n.targetPages} pages</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/notes/${n.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" /> View Summary
                    </Link>
                    {n.originalFilename && (
                      <a
                        href={`/api/notes/${n.id}/file`}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                        title={`Original: ${n.originalFilename}${n.originalSizeBytes ? " · " + bytesHuman(n.originalSizeBytes) : ""}`}
                      >
                        <Download className="w-4 h-4" /> Original
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
