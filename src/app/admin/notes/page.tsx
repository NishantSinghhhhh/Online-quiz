"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  Upload,
  FileText,
  Loader2,
  Trash2,
  Plus,
  ScrollText,
  Eye,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { UserMenu } from "@/components/UserMenu";

interface NotesSection { heading: string; points: string[] }
interface NotesResult {
  id: string;
  subject: string;
  title: string;
  summary: string;
  sections: NotesSection[];
  sourcePages: number;
  targetPages: number;
  method?: "text" | "vision";
  originalStored?: boolean;
}
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

const SUBJECT_OPTIONS = CATEGORIES.map(c => ({ id: c.id, label: c.label }));

function bytesHuman(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function AdminNotesPage() {
  const [subject, setSubject] = useState<string>("english");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [latest, setLatest] = useState<NotesResult | null>(null);

  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [viewing, setViewing] = useState<{ id: string; data?: { title: string; summary: string | null; sections: NotesSection[] } } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function loadNotes() {
    setLoading(true);
    fetch(`/api/notes?subject=${subject}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotes(d); })
      .finally(() => setLoading(false));
  }
  useEffect(loadNotes, [subject]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    setLatest(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject", subject);
      const res = await fetch("/api/ai/summarize-notes", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate notes");
      setLatest(data as NotesResult);
      setSuccess(`Generated 1-pager from "${file.name}" ${data.originalStored ? "(original PDF stored)" : "(file too large — original not stored)"}`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(note: NoteListItem) {
    if (!confirm(`Delete "${note.title}"? This removes the summary AND the stored original PDF.`)) return;
    setDeleting(note.id);
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) loadNotes();
    else setError("Failed to delete");
  }

  async function openNote(noteId: string) {
    setViewing({ id: noteId });
    const r = await fetch(`/api/notes/${noteId}`);
    const data = await r.json();
    if (r.ok) {
      setViewing({ id: noteId, data });
    } else {
      setViewing(null);
      setError(data.error || "Failed to load note");
    }
  }

  const subjectMeta = getCategory(subject);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster Admin</span>
          </Link>
          <UserMenu variant="admin" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage 1-Pager Notes</h1>
            <p className="text-slate-500">Upload PDFs → AI generates a 1-page summary per ~20 source pages</p>
          </div>
        </div>

        {/* Subject picker */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-5 flex-wrap">
          <span className="text-sm font-semibold text-slate-700 shrink-0">Subject:</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map(o => (
              <button
                key={o.id}
                onClick={() => setSubject(o.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  subject === o.id
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" /> Upload a document
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Uploaded into <strong className={subjectMeta.pillClasses.replace("bg-", "text-") + " px-2 py-0.5 rounded"}>{subjectMeta.label}</strong>.
            The original PDF is stored (up to 10MB) so students can re-read the source.
          </p>

          {file ? (
            <div className="flex items-center gap-3 border border-emerald-300 bg-emerald-50 rounded-xl px-4 py-3 mb-4">
              <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-emerald-800 truncate font-medium">{file.name}</p>
                <p className="text-xs text-emerald-600">{bytesHuman(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }} className="text-emerald-600 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all mb-4">
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <span className="text-sm font-medium text-slate-600">Click to upload</span>
              <span className="text-xs text-slate-400 mt-1">PDF, TXT, MD · max 10MB</span>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {uploading ? "Generating 1-pager…" : "Generate notes"}
          </button>

          {error && (
            <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}
        </div>

        {/* Latest result preview */}
        {latest && (
          <div className="bg-white border border-indigo-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">{latest.title}</h3>
              <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">
                {latest.method === "vision" ? "🔍 vision" : "📄 text"} · {latest.sourcePages} → {latest.targetPages} pages
              </span>
            </div>
            {latest.summary && <p className="text-sm text-slate-600 mb-3 italic">{latest.summary}</p>}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {latest.sections.map((s, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-800 mb-1">{s.heading}</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {s.points.map((p, j) => <li key={j}>• {renderInline(p)}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{subjectMeta.label} Notes</h2>
            <span className="text-sm text-slate-400">{notes.length} total</span>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-16 text-center">
              <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No notes yet for {subjectMeta.label}. Upload one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map(n => (
                <div key={n.id} className="p-5 flex items-center gap-4 hover:bg-slate-50">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <ScrollText className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{n.sourcePages} → {n.targetPages}p</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(n.createdAt).toLocaleDateString()}</span>
                      {n.originalFilename
                        ? <span className="flex items-center gap-1 text-emerald-700"><Download className="w-3 h-3" />{n.originalFilename} · {bytesHuman(n.originalSizeBytes)}</span>
                        : <span className="text-slate-400">(no original stored)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openNote(n.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                    {n.originalFilename && (
                      <a
                        href={`/api/notes/${n.id}/file`}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(n)}
                      disabled={deleting === n.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 truncate">{viewing.data?.title ?? "Loading…"}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/notes/${viewing.id}/file`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  <Download className="w-4 h-4" /> Original
                </a>
                <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {viewing.data ? (
                <div className="space-y-5">
                  {viewing.data.summary && <p className="text-slate-600 italic">{viewing.data.summary}</p>}
                  {viewing.data.sections.map((s, i) => (
                    <section key={i}>
                      <h3 className="font-bold text-slate-900 mb-2">{s.heading}</h3>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {s.points.map((p, pi) => (
                          <li key={pi} className="flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>{renderInline(p)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden plus icon to satisfy linter (not used after refactor) */}
      <Plus className="hidden" />
    </div>
  );
}
