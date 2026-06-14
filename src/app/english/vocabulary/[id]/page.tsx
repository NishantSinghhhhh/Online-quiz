"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronLeft, ChevronRight, Lightbulb,
  CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight,
} from "lucide-react";
import { VocabSet, VocabWord } from "@/types/english";

type Phase = "study" | "review" | "done";

export default function FlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [set, setSet] = useState<VocabSet | null>(null);
  const [loading, setLoading] = useState(true);

  // Study state
  const [phase, setPhase] = useState<Phase>("study");
  const [deck, setDeck] = useState<VocabWord[]>([]);   // current deck (all or wrong)
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [sessionWrong, setSessionWrong] = useState<VocabWord[]>([]); // wrong in this pass

  useEffect(() => {
    fetch(`/api/vocab-sets/${id}`)
      .then(r => r.json())
      .then((data: VocabSet) => {
        setSet(data);
        setDeck(data.words);
        setLoading(false);
      });
  }, [id]);

  function flipCard() {
    if (!flipped) setFlipped(true);
  }

  function gradeCard(knew: boolean) {
    const word = deck[current];
    const newSessionWrong = knew
      ? sessionWrong
      : [...sessionWrong, word];

    if (!knew) setWrongIds(prev => new Set([...prev, word.id]));

    if (current < deck.length - 1) {
      setCurrent(c => c + 1);
      setFlipped(false);
      setShowHint(false);
      if (!knew) setSessionWrong(newSessionWrong);
    } else {
      // End of pass
      const finalWrong = knew
        ? sessionWrong
        : [...sessionWrong, word];

      if (finalWrong.length > 0) {
        setDeck(finalWrong);
        setSessionWrong([]);
        setCurrent(0);
        setFlipped(false);
        setShowHint(false);
        setPhase("review");
      } else {
        setPhase("done");
      }
    }
  }

  function restart() {
    if (!set) return;
    setDeck(set.words);
    setCurrent(0);
    setFlipped(false);
    setShowHint(false);
    setWrongIds(new Set());
    setSessionWrong([]);
    setPhase("study");
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!set) return <div className="min-h-screen flex items-center justify-center text-slate-500">Not found</div>;

  // ── Done screen ──────────────────────────────────────────────────────────
  if (phase === "done") {
    const total = set.words.length;
    const correct = total - wrongIds.size;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-violet-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{set.title}</h1>
          <p className="text-slate-500 mb-6">Flashcard session complete</p>
          <div className="text-5xl font-bold text-slate-900 mb-2">
            {correct}<span className="text-2xl text-slate-400">/{total}</span>
          </div>
          <div className="text-2xl font-semibold text-violet-600 mb-8">{pct}%</div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-600">{correct}</div>
              <div className="text-xs text-emerald-500">Knew it</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-500">{wrongIds.size}</div>
              <div className="text-xs text-red-400">Missed</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Again
            </button>
            <Link
              href={`/english/vocabulary/${id}/quiz`}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              Take Quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Study / Review screen ─────────────────────────────────────────────────
  const word = deck[current];
  const isReview = phase === "review";

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/english/vocabulary" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Vocabulary
          </Link>
          <div className="flex items-center gap-2">
            {isReview && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-3 py-1 rounded-full">
                Review — {deck.length} missed
              </span>
            )}
            <Link
              href={`/english/vocabulary/${id}/quiz`}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Take Quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{set.title}</h1>
        <p className="text-slate-500 mb-6">
          {isReview ? "Let's go through the ones you missed" : `${set.words.length} words · Flashcard mode`}
        </p>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isReview ? "bg-red-400" : "bg-violet-500"}`}
              style={{ width: `${((current + 1) / deck.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-600">{current + 1}/{deck.length}</span>
        </div>

        {/* Card */}
        <div
          onClick={flipCard}
          className={`cursor-pointer select-none relative bg-white border-2 rounded-3xl p-10 min-h-64 flex flex-col items-center justify-center text-center transition-all shadow-sm ${
            flipped
              ? "border-violet-400"
              : "border-slate-200 hover:border-violet-300"
          }`}
        >
          {!flipped ? (
            <>
              {word.partOfSpeech && (
                <span className="text-xs font-medium text-violet-500 uppercase tracking-widest mb-3">
                  {word.partOfSpeech}
                </span>
              )}
              <h2 className="text-4xl font-bold text-slate-900 mb-4">{word.word}</h2>
              <p className="text-sm text-slate-400">Tap to reveal meaning</p>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-violet-500 uppercase tracking-widest mb-3">Meaning</span>
              <p className="text-xl font-semibold text-slate-800 mb-4">{word.meaning}</p>
              {word.example && (
                <p className="text-sm text-slate-500 italic border-t border-slate-100 pt-4 mt-2">
                  &ldquo;{word.example}&rdquo;
                </p>
              )}
            </>
          )}
          <div className="absolute bottom-4 right-4">
            <span className="text-xs text-slate-300">{flipped ? "tap to flip back" : "tap to flip"}</span>
          </div>
        </div>

        {/* Hint button — always visible before flip */}
        {!flipped && (word.mnemonic || word.tips) && (
          <div className="mt-4">
            <button
              onClick={() => setShowHint(h => !h)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
            {showHint && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 animate-fade-in">
                {word.mnemonic && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" /> Memory Trick
                    </p>
                    <p className="text-sm text-amber-900">{word.mnemonic}</p>
                  </div>
                )}
                {word.tips && (
                  <p className="text-sm text-amber-700 mt-1">{word.tips}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grade buttons — only after flip */}
        {flipped && (
          <div className="mt-5 grid grid-cols-2 gap-3 animate-fade-in">
            <button
              onClick={() => gradeCard(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-semibold hover:bg-red-100 hover:border-red-400 transition-all"
            >
              <XCircle className="w-5 h-5" /> Missed it
            </button>
            <button
              onClick={() => gradeCard(true)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 hover:border-emerald-400 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" /> Knew it
            </button>
          </div>
        )}

        {/* Dot progress */}
        <div className="flex justify-center gap-1.5 mt-6">
          {deck.slice(Math.max(0, current - 3), Math.min(deck.length, current + 4)).map((_, i) => {
            const idx = Math.max(0, current - 3) + i;
            return (
              <div
                key={idx}
                className={`rounded-full transition-all ${
                  idx === current
                    ? "w-4 h-2 bg-violet-600"
                    : "w-2 h-2 bg-slate-300"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
