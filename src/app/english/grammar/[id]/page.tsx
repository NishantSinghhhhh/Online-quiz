"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronLeft, ChevronRight, GraduationCap, Lightbulb,
  CheckCircle2, XCircle, AlertTriangle, BookOpen, Trophy, RotateCcw,
} from "lucide-react";
import { GrammarRule } from "@/types/english";
import { QuizQuestion } from "@/types/quiz";

function getSessionId() {
  return localStorage.getItem("me_user_id") ?? "";
}

type Tab = "rule" | "examples" | "practice";

export default function GrammarRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rule, setRule] = useState<GrammarRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("rule");

  // Practice quiz state
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const practiceStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    fetch(`/api/grammar-rules/${id}`)
      .then(r => r.json())
      .then(data => { setRule(data); setLoading(false); });
  }, [id]);

  function handleSelectAnswer(i: number) {
    if (revealed || !rule?.questions) return;
    setSelected(i);
    setRevealed(true);
    const isCorrect = i === rule.questions[currentQ].correctAnswer;
    if (isCorrect) setScore(s => s + 1);
    else setWrongIds(prev => [...prev, currentQ]);
  }

  async function handleNextQ() {
    if (!rule?.questions) return;
    if (currentQ < rule.questions.length - 1) {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      // Last question — derive final wrong list then persist
      const lastWasCorrect = selected === rule.questions[currentQ].correctAnswer;
      const finalWrongIds = lastWasCorrect ? wrongIds : [...wrongIds, currentQ];
      await fetch(`/api/grammar-rules/${id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          wrongIds: finalWrongIds,
          score,
          total: rule.questions.length,
          timeTaken: Math.floor((Date.now() - practiceStartedAt.current) / 1000),
        }),
      });
      setDone(true);
    }
  }

  function resetPractice() {
    setCurrentQ(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setWrongIds([]);
    setDone(false);
    practiceStartedAt.current = Date.now();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  if (!rule) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Not found</div>
  );

  const questions: QuizQuestion[] = rule.questions || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/english/grammar" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Grammar Rules
          </Link>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
            <BookOpen className="w-3 h-3" /> {rule.topic}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{rule.title}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {(["rule", "examples", "practice"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "practice") resetPractice(); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "practice" ? `Practice${questions.length > 0 ? ` (${questions.length})` : ""}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Rule tab */}
        {tab === "rule" && (
          <div className="space-y-4">
            {/* The Rule */}
            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-emerald-700 uppercase text-xs tracking-wide">The Rule</h2>
              </div>
              <p className="text-slate-800 leading-relaxed text-base">{rule.rule}</p>
            </div>

            {/* Memory Trick */}
            {rule.memoryTrick && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h2 className="font-bold text-amber-700 uppercase text-xs tracking-wide">Memory Trick</h2>
                </div>
                <p className="text-amber-900 leading-relaxed">{rule.memoryTrick}</p>
              </div>
            )}

            {/* Exam Traps */}
            {rule.examTraps && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="font-bold text-red-600 uppercase text-xs tracking-wide">Exam Traps</h2>
                </div>
                <p className="text-red-900 leading-relaxed">{rule.examTraps}</p>
              </div>
            )}

            {/* Navigate to next tab */}
            {rule.examples && (rule.examples.correct.length > 0 || rule.examples.wrong.length > 0) && (
              <button
                onClick={() => setTab("examples")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                View Examples <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Examples tab */}
        {tab === "examples" && (
          <div className="space-y-4">
            {rule.examples.correct.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold text-emerald-700 text-sm">Correct Usage</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {rule.examples.correct.map((ex, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700">{ex}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rule.examples.wrong.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <h2 className="font-semibold text-red-600 text-sm">Incorrect Usage</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {rule.examples.wrong.map((ex, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 line-through decoration-red-300">{ex}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questions.length > 0 && (
              <button
                onClick={() => { setTab("practice"); resetPractice(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                Practice Questions <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Practice tab */}
        {tab === "practice" && (
          <div>
            {questions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No practice questions for this rule.</p>
              </div>
            ) : done ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <Trophy className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Practice Complete</h2>
                <p className="text-slate-500 mb-6">{rule.title}</p>
                <div className="text-5xl font-bold text-slate-900 mb-2">
                  {score}<span className="text-2xl text-slate-400">/{questions.length}</span>
                </div>
                <div className="text-xl font-semibold text-emerald-600 mb-8">
                  {Math.round((score / questions.length) * 100)}%
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-600">{score}</div>
                    <div className="text-xs text-emerald-500">Correct</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-500">{questions.length - score}</div>
                    <div className="text-xs text-red-400">Wrong</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTab("rule")}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Rule
                  </button>
                  <button
                    onClick={resetPractice}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Progress bar */}
                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                  <span>Question {currentQ + 1} of {questions.length}</span>
                  <span className="font-medium text-slate-700">{score} correct</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mb-6">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${((currentQ) / questions.length) * 100}%` }}
                  />
                </div>

                {/* Question */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
                  <p className="text-slate-800 font-medium text-base leading-relaxed">
                    {questions[currentQ].question}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-4">
                  {questions[currentQ].options.map((opt, i) => {
                    const isCorrect = i === questions[currentQ].correctAnswer;
                    const isSelected = i === selected;
                    let style = "border-slate-200 bg-white text-slate-700 hover:border-emerald-300";
                    if (revealed) {
                      if (isCorrect) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
                      else if (isSelected) style = "border-red-400 bg-red-50 text-red-700";
                      else style = "border-slate-100 bg-slate-50 text-slate-400";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectAnswer(i)}
                        disabled={revealed}
                        className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${style}`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${
                          revealed && isCorrect ? "bg-emerald-500 text-white"
                          : revealed && isSelected ? "bg-red-400 text-white"
                          : "bg-slate-200 text-slate-600"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                        {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 float-right mt-1" />}
                        {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 float-right mt-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {revealed && questions[currentQ].explanation && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 mb-4 animate-fade-in">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Explanation</p>
                    <p className="text-sm text-indigo-800">{questions[currentQ].explanation}</p>
                  </div>
                )}

                {revealed && (
                  <button
                    onClick={handleNextQ}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors animate-fade-in"
                  >
                    {currentQ < questions.length - 1
                      ? <><span>Next Question</span><ChevronRight className="w-4 h-4" /></>
                      : <><Trophy className="w-4 h-4" /><span>See Results</span></>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
