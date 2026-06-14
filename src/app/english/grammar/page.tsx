"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronLeft, GraduationCap, BookOpen, ArrowRight } from "lucide-react";

interface GrammarRuleSummary {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
}

export default function GrammarPage() {
  const [rules, setRules] = useState<GrammarRuleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grammar-rules")
      .then(r => r.json())
      .then(setRules)
      .finally(() => setLoading(false));
  }, []);

  const topics = Array.from(new Set(rules.map(r => r.topic)));

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Grammar Rules</h1>
        <p className="text-slate-500 mb-8">Daily Rule Revision cards — rule, memory trick, examples, and practice questions.</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No grammar rules yet.</p>
            <Link href="/admin/english" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors">
              Upload DRR PDF
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {topics.map(topic => (
              <div key={topic}>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{topic}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rules.filter(r => r.topic === topic).map(rule => (
                    <Link
                      key={rule.id}
                      href={`/english/grammar/${rule.id}`}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                          <GraduationCap className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors mt-1" />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{rule.title}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(rule.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
