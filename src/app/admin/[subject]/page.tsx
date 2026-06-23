"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Sparkles, ChevronLeft, Upload, FileText, Loader2, Trash2,
  Plus, ScrollText,
  Eye, X, ClipboardList, Clock,
} from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";

interface NotesSection { heading: string; points: string[] }
interface NotesResult {
  id: string;
  subject: string;
  title: string;
  summary: string;
  sections: NotesSection[];
  sourcePages: number;
  targetPages: number;
}
interface NoteListItem {
  id: string;
  title: string;
  summary: string | null;
  sourcePages: number;
  targetPages: number;
  createdAt: string;
}
interface QuizListItem {
  id: string;
  title: string;
  questionCount: number;
  timeLimit: number;
  attemptCount: number;
  category?: string;
}

// Dynamic [subject] route — handles all non-English subjects.
// (English has its own dedicated /admin/english page.)
const SUBJECT_IDS: CategoryId[] = ["physics", "chemistry", "biology", "maths", "general"];

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function SubjectAdminPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = use(params);
  if (!SUBJECT_IDS.includes(subject as CategoryId)) notFound();

  const meta = CATEGORIES.find(c => c.id === subject)!;
  const Icon = meta.icon;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<NotesResult | null>(null);

  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch(`/api/notes?subject=${subject}`).then(r => r.json()),
      fetch(`/api/quizzes?category=${subject}`).then(r => r.json()),
    ])
      .then(([n, q]) => {
        setNotes(Array.isArray(n) ? n : []);
        setQuizzes(Array.isArray(q) ? q : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [subject]);

  async function generate() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject", subject);
      const res = await fetch("/api/ai/summarize-notes", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setActiveNote(data);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setUploading(false);
    }
  }

  async function openNote(id: string) {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) setActiveNote(await res.json());
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete these notes?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    loadAll();
    if (activeNote?.id === id) setActiveNote(null);
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    loadAll();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Admin
          </Link>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${meta.pillClasses}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{meta.longLabel}</h1>
            <p className="text-slate-500">Upload notes, generate condensed 1-pagers, and create quizzes.</p>
          </div>
        </div>

        {/* Upload card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ScrollText className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Generate Notes</h2>
            <span className="text-xs text-slate-400 ml-auto">1 page summary per 20 input pages</span>
          </div>

          <label className="block">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              disabled={uploading}
            />
            <div className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              file ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-amber-300 hover:bg-amber-50"
            }`}>
              {file ? (
                <>
                  <FileText className="w-9 h-9 text-amber-600 mx-auto mb-2" />
                  <p className="font-medium text-slate-900 mb-0.5">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700 mb-0.5">Click to choose a PDF</p>
                  <p className="text-xs text-slate-400">or .txt / .md file</p>
                </>
              )}
            </div>
          </label>

          {error && (
            <div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={!file || uploading}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>)
                       : (<><Sparkles className="w-4 h-4" /> Generate Notes</>)}
          </button>
        </div>

        {/* Saved Notes */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Saved Notes <span className="text-slate-400 font-normal">({notes.length})</span>
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
          ) : notes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No notes yet. Upload a PDF above to get started.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <ScrollText className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{n.sourcePages} → {n.targetPages} {n.targetPages === 1 ? "page" : "pages"}</span>
                      <span>·</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => openNote(n.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button onClick={() => deleteNote(n.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quizzes */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {meta.longLabel} Quizzes <span className="text-slate-400 font-normal">({quizzes.length})</span>
            </h2>
            <Link
              href={`/admin/create?category=${subject}`}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Quiz
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
          ) : quizzes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No {meta.longLabel} quizzes yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {quizzes.map((q) => (
                <div key={q.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <ClipboardList className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{q.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{q.questionCount} questions</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.timeLimit} min</span>
                      <span>{q.attemptCount} attempts</span>
                    </div>
                  </div>
                  <Link href={`/admin/quiz/${q.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" /> View
                  </Link>
                  <button onClick={() => deleteQuiz(q.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes viewer modal */}
      {activeNote && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
          onClick={() => setActiveNote(null)}
        >
          <article
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-8 sm:p-10 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                {activeNote.sourcePages} → {activeNote.targetPages} {activeNote.targetPages === 1 ? "page" : "pages"}
              </div>
              <button
                onClick={() => setActiveNote(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{activeNote.title}</h1>
            {activeNote.summary && (
              <p className="text-slate-600 italic border-l-4 border-amber-300 pl-4 mb-8">
                {renderInline(activeNote.summary)}
              </p>
            )}
            <div className="space-y-6">
              {activeNote.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-3">{s.heading}</h2>
                  <ul className="space-y-1.5 list-disc list-outside ml-5">
                    {s.points.map((p, j) => (
                      <li key={j} className="text-slate-700 leading-relaxed">{renderInline(p)}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
