"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sparkles, ChevronLeft, FileText, Upload, Loader2,
  BookOpen, Printer, RotateCcw, ScrollText, Trash2, Eye,
} from "lucide-react";

interface NotesSection {
  heading: string;
  points: string[];
}

interface NotesResult {
  id?: string;
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

// Render **bold** spans without a markdown lib
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function NotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotesResult | null>(null);
  const [history, setHistory] = useState<NoteListItem[]>([]);

  function loadHistory() {
    fetch("/api/notes?subject=english")
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []));
  }

  useEffect(loadHistory, []);

  async function generate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject", "english");
      const res = await fetch("/api/ai/summarize-notes", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function openSaved(id: string) {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) setResult(await res.json());
  }

  async function deleteSaved(id: string) {
    if (!confirm("Delete these notes?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    loadHistory();
    if (result?.id === id) setResult(null);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/english" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> English Hub
          </Link>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {!result && (
          <>
            <div className="text-center mb-8 print:hidden">
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
                <BookOpen className="w-3 h-3" /> AI Note Compressor
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Condense Notes</h1>
              <p className="text-slate-500">
                Upload a PDF and get back ~1 page of dense study notes per 20 input pages.
              </p>
            </div>

            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8">
              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  disabled={loading}
                />
                <div className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  file ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                }`}>
                  {file ? (
                    <>
                      <FileText className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                      <p className="font-medium text-slate-900 mb-1">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="font-medium text-slate-700 mb-1">Click to choose a PDF</p>
                      <p className="text-xs text-slate-400">or .txt / .md file</p>
                    </>
                  )}
                </div>
              </label>

              {error && (
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={generate}
                disabled={!file || loading}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating notes…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Notes
                  </>
                )}
              </button>
            </div>

            {/* Saved notes history */}
            {history.length > 0 && (
              <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">Saved Notes</h2>
                  <span className="text-xs text-slate-400 ml-auto">{history.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {history.map((n) => (
                    <div key={n.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          <span>{n.sourcePages} → {n.targetPages} {n.targetPages === 1 ? "page" : "pages"}</span>
                          <span>·</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => openSaved(n.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button onClick={() => deleteSaved(n.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {result && (
          <article className="bg-white border border-slate-200 rounded-2xl p-10 print:border-0 print:p-0 print:bg-transparent">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                {result.sourcePages} pages → {result.targetPages} page{result.targetPages !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> New
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">{result.title}</h1>
            {result.summary && (
              <p className="text-slate-600 italic border-l-4 border-amber-300 pl-4 mb-8">
                {renderInline(result.summary)}
              </p>
            )}

            <div className="space-y-6">
              {result.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-3">
                    {s.heading}
                  </h2>
                  <ul className="space-y-1.5 list-disc list-outside ml-5">
                    {s.points.map((p, j) => (
                      <li key={j} className="text-slate-700 leading-relaxed">
                        {renderInline(p)}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
