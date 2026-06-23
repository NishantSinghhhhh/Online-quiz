"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, BookOpen, GraduationCap, ArrowRight, Globe, FileText, ScrollText } from "lucide-react";

export default function EnglishPage() {
  const [vocabCount, setVocabCount] = useState(0);
  const [grammarCount, setGrammarCount] = useState(0);

  useEffect(() => {
    fetch("/api/vocab-sets").then(r => r.json()).then(d => setVocabCount(Array.isArray(d) ? d.length : 0));
    fetch("/api/grammar-rules").then(r => r.json()).then(d => setGrammarCount(Array.isArray(d) ? d.length : 0));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
          <Link href="/admin/english" className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors">
            Manage Content
          </Link>
        </div>
      </nav>

      <div className="bg-gradient-to-b from-violet-50 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <Globe className="w-3.5 h-3.5" /> English Learning Hub
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Master English</h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            Build vocabulary and master grammar rules with AI-powered learning tools.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vocabulary */}
          <Link href="/english/vocabulary" className="group border-2 border-slate-200 hover:border-violet-400 rounded-2xl p-8 transition-all hover:shadow-lg bg-white">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-violet-600 transition-colors">
              <BookOpen className="w-7 h-7 text-violet-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vocabulary</h2>
            <p className="text-slate-500 mb-5">
              Learn words with AI-generated mnemonics and memory tricks. Quiz yourself on word meanings.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{vocabCount} word set{vocabCount !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1 text-violet-600 font-medium text-sm group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Grammar */}
          <Link href="/english/grammar" className="group border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-8 transition-all hover:shadow-lg bg-white">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-600 transition-colors">
              <GraduationCap className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Grammar Rules</h2>
            <p className="text-slate-500 mb-5">
              Study grammar through Daily Rule Revision cards — rule, memory trick, examples, and practice questions.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{grammarCount} rule{grammarCount !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium text-sm group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Note Compressor */}
        <Link href="/english/notes" className="group block mt-6 border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-8 transition-all hover:shadow-lg bg-white">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 transition-colors shrink-0">
              <ScrollText className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Condense Notes</h2>
              <p className="text-slate-500 text-sm">
                Upload a PDF — get ~1 page of dense, exam-ready notes per 20 pages.
              </p>
            </div>
            <span className="flex items-center gap-1 text-amber-600 font-medium text-sm group-hover:gap-2 transition-all">
              Open <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <div className="mt-8 bg-gradient-to-r from-violet-50 to-emerald-50 border border-slate-200 rounded-2xl p-6 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">Upload your PDFs to get started</p>
          <p className="text-sm text-slate-400 mb-4">Vocabulary lists and DRR grammar sheets are auto-extracted by AI</p>
          <Link href="/admin/english" className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-violet-700 transition-colors text-sm">
            Upload PDFs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
