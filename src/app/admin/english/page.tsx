"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronLeft, Upload, BookOpen, GraduationCap,
  CheckCircle2, AlertCircle, Loader2, FileText, X, Trash2,
} from "lucide-react";
import { useEffect } from "react";

interface VocabSetSummary {
  id: string;
  title: string;
  wordCount: number;
  createdAt: string;
}

interface GrammarRuleSummary {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
}

type UploadState = "idle" | "loading" | "success" | "error";

function UploadPanel({
  title,
  icon: Icon,
  accent,
  endpoint,
  accept,
  hint,
  onSuccess,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  endpoint: string;
  accept: string;
  hint: string;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");

  async function handleUpload() {
    if (!file) return;
    setState("loading");
    setMessage("");
    setDetail("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setState("success");
      setMessage(data.message || "Uploaded successfully");
      setDetail(data.detail || "");
      setFile(null);
      onSuccess();
    } catch (e: unknown) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Upload failed");
    }
  }

  const borderAccent = accent === "violet"
    ? "border-violet-400 bg-violet-50"
    : "border-emerald-400 bg-emerald-50";
  const iconBg = accent === "violet" ? "bg-violet-600" : "bg-emerald-600";
  const btnBg = accent === "violet"
    ? "bg-violet-600 hover:bg-violet-700"
    : "bg-emerald-600 hover:bg-emerald-700";
  const dropHover = accent === "violet"
    ? "hover:border-violet-400 hover:bg-violet-50"
    : "hover:border-emerald-400 hover:bg-emerald-50";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>

      <p className="text-sm text-slate-500 mb-5">{hint}</p>

      <div className="space-y-4">
        {file ? (
          <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 ${borderAccent}`}>
            <FileText className="w-5 h-5 shrink-0 text-slate-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setState("idle"); }} className="text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer transition-all ${dropHover}`}>
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-slate-600">Click to upload PDF</span>
            <span className="text-xs text-slate-400 mt-1">{accept}</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); setState("idle"); setMessage(""); }}
            />
          </label>
        )}

        {state === "success" && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-800 font-medium">{message}</p>
              {detail && <p className="text-xs text-emerald-600 mt-0.5">{detail}</p>}
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{message}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || state === "loading"}
          className={`w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors ${btnBg}`}
        >
          {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {state === "loading" ? "Processing with AI..." : "Upload & Extract"}
        </button>
      </div>
    </div>
  );
}

export default function AdminEnglishPage() {
  const [vocabSets, setVocabSets] = useState<VocabSetSummary[]>([]);
  const [grammarRules, setGrammarRules] = useState<GrammarRuleSummary[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadVocab() {
    fetch("/api/vocab-sets").then(r => r.json()).then(setVocabSets).catch(() => {});
  }
  function loadGrammar() {
    fetch("/api/grammar-rules").then(r => r.json()).then(setGrammarRules).catch(() => {});
  }

  useEffect(() => { loadVocab(); loadGrammar(); }, []);

  async function deleteVocabSet(id: string) {
    setDeletingId(id);
    await fetch(`/api/vocab-sets/${id}`, { method: "DELETE" });
    setDeletingId(null);
    loadVocab();
  }

  async function deleteGrammarRule(id: string) {
    setDeletingId(id);
    await fetch(`/api/grammar-rules/${id}`, { method: "DELETE" });
    setDeletingId(null);
    loadGrammar();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster Admin</span>
          </Link>
          <Link href="/english" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View English Hub
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">English Content</h1>
        <p className="text-slate-500 mb-8">Upload vocabulary PDFs and DRR grammar sheets to populate the English Hub.</p>

        {/* Upload panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <UploadPanel
            title="Vocabulary PDF"
            icon={BookOpen}
            accent="violet"
            endpoint="/api/ai/extract-vocab"
            accept="PDF with word list"
            hint="Upload a PDF containing words and their meanings. AI will extract each word, generate mnemonics, example sentences, and memory tricks."
            onSuccess={loadVocab}
          />
          <UploadPanel
            title="DRR Grammar PDF"
            icon={GraduationCap}
            accent="emerald"
            endpoint="/api/ai/extract-grammar"
            accept="DRR format PDF"
            hint="Upload a Daily Rule Revision PDF. AI will extract the rule, memory trick, correct/incorrect examples, exam traps, and practice questions."
            onSuccess={loadGrammar}
          />
        </div>

        {/* Existing vocab sets */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-600" />
            Vocabulary Sets
            <span className="ml-auto text-sm font-normal text-slate-400">{vocabSets.length} set{vocabSets.length !== 1 ? "s" : ""}</span>
          </h2>
          {vocabSets.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
              No vocabulary sets yet — upload a PDF above.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {vocabSets.map(set => (
                  <div key={set.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{set.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {set.wordCount} words · {new Date(set.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/english/vocabulary/${set.id}`} className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                        View
                      </Link>
                      <button
                        onClick={() => deleteVocabSet(set.id)}
                        disabled={deletingId === set.id}
                        className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingId === set.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing grammar rules */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            Grammar Rules
            <span className="ml-auto text-sm font-normal text-slate-400">{grammarRules.length} rule{grammarRules.length !== 1 ? "s" : ""}</span>
          </h2>
          {grammarRules.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
              No grammar rules yet — upload a DRR PDF above.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {grammarRules.map(rule => (
                  <div key={rule.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{rule.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rule.topic} · {new Date(rule.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/english/grammar/${rule.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        View
                      </Link>
                      <button
                        onClick={() => deleteGrammarRule(rule.id)}
                        disabled={deletingId === rule.id}
                        className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
