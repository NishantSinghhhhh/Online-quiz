"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, ChevronLeft, ChevronRight, Sparkles, Lightbulb, BookOpen, Flag } from "lucide-react";
import { QuizQuestion } from "@/types/quiz";

function getSessionId(): string {
  let id = localStorage.getItem("quiz_session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("quiz_session_id", id); }
  return id;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

interface QuizData {
  id: string;
  title: string;
  timeLimit: number;
  questions: QuizQuestion[];
}

function RetryQuizInner() {
  const router = useRouter();
  const params = useSearchParams();
  const quizId = params.get("quizId");

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"start" | "quiz" | "submitting">("start");
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [shownHints, setShownHints] = useState<Set<number>>(new Set());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!quizId) return;
    fetch(`/api/quizzes/${quizId}`)
      .then((r) => r.json())
      .then((data) => { setQuiz(data); setLoading(false); });
  }, [quizId]);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    setStatus("submitting");
    const sessionId = getSessionId();
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: quiz.id, sessionId: `retry_${sessionId}`, answers, startedAt, isRetry: true }),
    });
    const data = await res.json();
    if (data.attemptId) router.push(`/quiz/${quiz.id}/results/${data.attemptId}`);
  }, [quiz, answers, startedAt, router]);

  useEffect(() => {
    if (status !== "quiz") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, handleSubmit]);

  if (!quizId) return <div className="min-h-screen flex items-center justify-center text-slate-500">No quiz specified.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!quiz) return <div className="min-h-screen flex items-center justify-center text-slate-500">Quiz not found.</div>;

  if (status === "start") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Link href="/review" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Review
          </Link>
          <div className="border border-slate-200 rounded-2xl p-8">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
              <Lightbulb className="w-6 h-6 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
            <p className="text-slate-500 mb-6">Practice the questions you got wrong. Hints are available this time!</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{quiz.questions.length}</div>
                <div className="text-xs text-slate-500 mt-1">Questions</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{quiz.timeLimit}m</div>
                <div className="text-xs text-slate-500 mt-1">Time Limit</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>A <strong>Show Hint</strong> button will appear on each question. Use it to see an explanation before answering.</span>
            </div>
            <button
              onClick={() => { setTimeLeft(quiz.timeLimit * 60); setStartedAt(new Date().toISOString()); setStatus("quiz"); }}
              className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              Start Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = quiz.questions[current];
  const selectedAnswer = answers[current];
  const hintShown = shownHints.has(current);
  const isLowTime = timeLeft < 60;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 hidden sm:block">Practice Mode</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-500">{Object.values(answers).filter(v => v !== null && v !== undefined).length}/{quiz.questions.length}</span>
            <div className={`flex items-center gap-2 font-mono font-bold text-lg ${isLowTime ? "text-red-600 animate-pulse" : "text-slate-900"}`}>
              <Clock className="w-4 h-4 text-slate-400" />{formatTime(timeLeft)}
            </div>
            <button onClick={handleSubmit} disabled={status === "submitting"}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {status === "submitting" ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(Object.values(answers).filter(v => v !== null && v !== undefined).length / quiz.questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 max-w-4xl mx-auto w-full px-4 py-6 gap-6">
        {/* Navigator */}
        <div className="hidden md:block w-44 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-24">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {quiz.questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined && answers[i] !== null;
                const isFlagged = flagged.has(i);
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
                      i === current ? "bg-amber-500 text-white" :
                      isFlagged ? "bg-amber-100 text-amber-700 border border-amber-300" :
                      isAnswered ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>{i + 1}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-slate-400">Q{current + 1} of {quiz.questions.length}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(current) ? n.delete(current) : n.add(current); return n; })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${flagged.has(current) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  <Flag className="w-3.5 h-3.5" /> {flagged.has(current) ? "Flagged" : "Flag"}
                </button>
                {q.explanation && (
                  <button
                    onClick={() => setShownHints(prev => { const n = new Set(prev); n.add(current); return n; })}
                    disabled={hintShown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-default transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5" /> {hintShown ? "Hint shown" : "Show Hint"}
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">{q.question}</h2>

            {hintShown && q.explanation && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wide mb-1">
                  <Lightbulb className="w-3.5 h-3.5" /> Hint
                </div>
                <p className="text-sm text-amber-800">{q.explanation}</p>
              </div>
            )}

            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium ${
                    selectedAnswer === i ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-slate-50"
                  }`}>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${selectedAnswer === i ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {current < quiz.questions.length - 1 ? (
                <button onClick={() => setCurrent(c => c + 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={status === "submitting"}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium">
                  {status === "submitting" ? "Saving..." : "Finish"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-amber-700">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Practice mode — wrong answers from this session will be added to your review bank.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RetryQuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
      <RetryQuizInner />
    </Suspense>
  );
}
