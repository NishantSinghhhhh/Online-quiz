"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  Download,
  FileText,
} from "lucide-react";
import { getCategory } from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

interface NotesSection { heading: string; points: string[] }
interface NotesDetail {
  id: string;
  subject: string;
  title: string;
  summary: string | null;
  sections: NotesSection[];
  sourcePages: number;
  targetPages: number;
  createdAt: string;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [note, setNote] = useState<NotesDetail | null>(null);
  const [hasOriginal, setHasOriginal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/notes/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/notes?subject=`).then(r => r.json()).catch(() => []),
    ]).then(([n, list]) => {
      if (n) setNote(n);
      if (Array.isArray(list)) {
        const meta = list.find((x: { id: string }) => x.id === id);
        setHasOriginal(Boolean(meta?.originalFilename));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Note not found.
      </div>
    );
  }

  const cat = getCategory(note.subject);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <UserMenu variant="student" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> All notes
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${cat.pillClasses}`}>
                <cat.icon className="w-3 h-3" /> {cat.label}
              </span>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{note.title}</h1>
              {note.summary && <p className="text-slate-600 leading-relaxed">{note.summary}</p>}
            </div>
            {hasOriginal && (
              <a
                href={`/api/notes/${note.id}/file`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" /> Original PDF
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{note.sourcePages} source → {note.targetPages} page summary</span>
            <span>·</span>
            <span>Generated {new Date(note.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>

        <div className="space-y-5">
          {note.sections.map((s, si) => (
            <section key={si} className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">{s.heading}</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {s.points.map((p, pi) => (
                  <li key={pi} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-indigo-500 mt-1 shrink-0">•</span>
                    <span>{renderInline(p)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
