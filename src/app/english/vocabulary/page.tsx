"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, BookOpen, ArrowRight, ChevronLeft, Hash } from "lucide-react";

interface VocabSetSummary {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  attemptCount: number;
  createdAt: string;
}

export default function VocabularyPage() {
  const [sets, setSets] = useState<VocabSetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vocab-sets")
      .then(r => r.json())
      .then(setSets)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/english" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">English Hub</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/english" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> English Hub
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Vocabulary Sets</h1>
        <p className="text-slate-500 mb-8">Learn words with mnemonics, examples, and AI-powered memory tricks.</p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : sets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No vocabulary sets yet.</p>
            <Link href="/admin/english" className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-violet-700 transition-colors">
              Upload Vocabulary PDF
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sets.map(set => (
              <div key={set.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Hash className="w-3 h-3" />{set.wordCount} words
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{set.title}</h3>
                {set.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{set.description}</p>}
                <div className="flex gap-2 mt-4">
                  <Link href={`/english/vocabulary/${set.id}`}
                    className="flex-1 text-center py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors">
                    Flashcards
                  </Link>
                  <Link href={`/english/vocabulary/${set.id}/quiz`}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                    Take Quiz <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
