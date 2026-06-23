"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Trophy, RotateCcw } from "lucide-react";
import { VocabWord } from "@/types/english";

function getSessionId() {
  return localStorage.getItem("me_user_id") ?? "";
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface QuizItem {
  word: VocabWord;
  options: string[]; // 4 meanings, one is correct
  correctIndex: number;
}

function buildQuizItems(words: VocabWord[]): QuizItem[] {
  const meanings = words.map(w => w.meaning);
  return shuffle(words).map(word => {
    const distractors = shuffle(meanings.filter(m => m !== word.meaning)).slice(0, 3);
    const options = shuffle([word.meaning, ...distractors]);
    return { word, options, correctIndex: options.indexOf(word.meaning) };
  });
}

type Status = "loading" | "quiz" | "done";

export default function VocabQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [startedAt] = useState(Date.now());
  const [setTitle, setSetTitle] = useState("");

  useEffect(() => {
    fetch(`/api/vocab-sets/${id}`)
      .then(r => r.json())
      .then(data => {
        setSetTitle(data.title);
        setItems(buildQuizItems(data.words));
        setStatus("quiz");
      });
  }, [id]);

  const saveAttempt = useCallback(async (finalWrongIds: string[], finalScore: number, total: number) => {
    const sessionId = getSessionId();
    await fetch(`/api/vocab-sets/${id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId, wrongWordIds: finalWrongIds, score: finalScore,
        total, timeTaken: Math.floor((Date.now() - startedAt) / 1000),
      }),
    });
  }, [id, startedAt]);

  function handleSelect(i: number) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    const item = items[current];
    const isCorrect = i === item.correctIndex;
    if (isCorrect) setScore(s => s + 1);
    else setWrongIds(prev => [...prev, item.word.id]);
  }

  async function handleNext() {
    if (current < items.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      const finalWrongIds = selected !== items[current].correctIndex && selected !== null
        ? [...wrongIds] : wrongIds;
      await saveAttempt(finalWrongIds, score, items.length);
      setStatus("done");
    }
  }

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>;

  if (status === "done") {
    const pct = Math.round((score / items.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-violet-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{setTitle}</h1>
          <p className="text-slate-500 mb-6">Vocabulary Quiz Complete</p>
          <div className="text-5xl font-bold text-slate-900 mb-2">{score}<span className="text-2xl text-slate-400">/{items.length}</span></div>
          <div className="text-2xl font-semibold text-violet-600 mb-8">{pct}%</div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-xl p-4"><div className="text-2xl font-bold text-emerald-600">{score}</div><div className="text-xs text-emerald-500">Correct</div></div>
            <div className="bg-red-50 rounded-xl p-4"><div className="text-2xl font-bold text-red-500">{items.length - score}</div><div className="text-xs text-red-400">Wrong</div></div>
          </div>
          <div className="flex gap-3">
            <Link href={`/english/vocabulary/${id}`} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Flashcards
            </Link>
            <button onClick={() => { setItems(buildQuizItems(items.map(i => i.word))); setCurrent(0); setSelected(null); setRevealed(false); setScore(0); setWrongIds([]); setStatus("quiz"); }}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const item = items[current];
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/english/vocabulary/${id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm font-medium text-slate-600">{current + 1} / {items.length}</span>
        </div>
        <div className="h-1 bg-slate-100"><div className="h-full bg-violet-500 transition-all" style={{ width: `${((current + 1) / items.length) * 100}%` }} /></div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-center text-sm text-slate-400 mb-3 uppercase tracking-wide">What does this word mean?</p>
        <h2 className="text-center text-4xl font-bold text-slate-900 mb-2">{item.word.word}</h2>
        {item.word.partOfSpeech && <p className="text-center text-sm text-violet-500 mb-8">{item.word.partOfSpeech}</p>}

        <div className="space-y-3 mb-6">
          {item.options.map((opt, i) => {
            let style = "border-slate-200 bg-white text-slate-700 hover:border-violet-300";
            if (revealed) {
              if (i === item.correctIndex) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (i === selected) style = "border-red-400 bg-red-50 text-red-700";
              else style = "border-slate-100 bg-slate-50 text-slate-400";
            }
            return (
              <button key={i} onClick={() => handleSelect(i)} disabled={revealed}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${style}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${revealed && i === item.correctIndex ? "bg-emerald-500 text-white" : revealed && i === selected ? "bg-red-400 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {revealed && i === item.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-500 float-right mt-1" />}
                {revealed && i === selected && i !== item.correctIndex && <XCircle className="w-4 h-4 text-red-400 float-right mt-1" />}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 animate-fade-in">
            {item.word.example && <p className="text-sm text-slate-600 italic mb-2">&ldquo;{item.word.example}&rdquo;</p>}
            {item.word.mnemonic && <p className="text-sm text-amber-700"><span className="font-semibold">Memory trick:</span> {item.word.mnemonic}</p>}
          </div>
        )}

        {revealed && (
          <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors animate-fade-in">
            {current < items.length - 1 ? <><span>Next Word</span><ChevronRight className="w-4 h-4" /></> : <><Trophy className="w-4 h-4" /><span>See Results</span></>}
          </button>
        )}
      </div>
    </div>
  );
}
