"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { QuizQuestion } from "@/types/quiz";

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questions: QuizQuestion[];
}

// Stable per-user id, set by /login on sign-in.
function getSessionId(): string {
  return localStorage.getItem("me_user_id") ?? "";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type PageStatus = "loading" | "start" | "quiz" | "submitting" | "already_attempted";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [existingAttemptId, setExistingAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<string>("");
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  useEffect(() => {
    const sessionId = getSessionId();
    fetch(`/api/quizzes/${id}`)
      .then((r) => r.json())
      .then(async (data: QuizData) => {
        setQuiz(data);
        const res = await fetch(`/api/attempts?quizId=${id}`);
        const check = await res.json();
        if (check.attempted) {
          setExistingAttemptId(check.attemptId);
          setStatus("already_attempted");
        } else {
          setStatus("start");
        }
      });
  }, [id]);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    setStatus("submitting");
    const sessionId = getSessionId();

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: id, sessionId, answers, startedAt }),
    });

    const data = await res.json();
    if (data.attemptId) {
      router.push(`/quiz/${id}/results/${data.attemptId}`);
    } else if (res.status === 409) {
      router.push(`/quiz/${id}/results/${data.attemptId}`);
    }
  }, [quiz, id, answers, startedAt, router]);

  useEffect(() => {
    if (status !== "quiz") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, handleSubmit]);

  function startQuiz() {
    if (!quiz) return;
    setTimeLeft(quiz.timeLimit * 60);
    setStartedAt(new Date().toISOString());
    setStatus("quiz");
  }

  function selectAnswer(qIndex: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  }

  function toggleFlag(qIndex: number) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qIndex)) next.delete(qIndex);
      else next.add(qIndex);
      return next;
    });
  }

  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const totalQuestions = quiz?.questions.length || 0;
  const isLowTime = timeLeft < 60 && timeLeft > 0;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (status === "already_attempted") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Already Attempted</h1>
          <p className="text-slate-500 mb-8">
            You have already taken this quiz. Each quiz can only be attempted once.
          </p>
          <div className="flex gap-3 justify-center">
            {existingAttemptId && (
              <Link
                href={`/quiz/${id}/results/${existingAttemptId}`}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                View My Results
              </Link>
            )}
            <Link
              href="/"
              className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "start" && quiz) {
    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to quizzes
          </Link>
          <div className="border border-slate-200 rounded-2xl p-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-slate-500 mb-6">{quiz.description}</p>
            )}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{quiz.questions.length}</div>
                <div className="text-xs text-slate-500 mt-1">Questions</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{quiz.timeLimit}m</div>
                <div className="text-xs text-slate-500 mt-1">Time Limit</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{totalMarks}</div>
                <div className="text-xs text-slate-500 mt-1">Total Marks</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
              <strong>Important:</strong> You can only attempt this quiz once. Make sure you have a stable internet connection before starting.
            </div>
            <button
              onClick={startQuiz}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((status === "quiz" || status === "submitting") && quiz) {
    const q = quiz.questions[currentQuestion];
    const selectedAnswer = answers[currentQuestion];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 hidden sm:block">{quiz.title}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate-500">{answeredCount}/{totalQuestions} answered</span>
              <div className={`flex items-center gap-2 font-mono font-bold text-lg ${isLowTime ? "text-red-600 animate-pulse" : "text-slate-900"}`}>
                <Clock className={`w-4 h-4 ${isLowTime ? "text-red-500" : "text-slate-400"}`} />
                {formatTime(timeLeft)}
              </div>
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {status === "submitting" ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 max-w-4xl mx-auto w-full px-4 py-6 gap-6">
          {/* Question navigator */}
          <div className="hidden md:block w-48 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-24">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Questions</p>
              <div className="grid grid-cols-5 gap-1.5">
                {quiz.questions.map((_, i) => {
                  const isAnswered = answers[i] !== undefined && answers[i] !== null;
                  const isFlagged = flagged.has(i);
                  const isCurrent = i === currentQuestion;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentQuestion(i)}
                      className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white"
                          : isFlagged
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : isAnswered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 rounded" /><span className="text-slate-500">Answered</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-100 rounded" /><span className="text-slate-500">Flagged</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 rounded" /><span className="text-slate-500">Not answered</span></div>
              </div>
            </div>
          </div>

          {/* Question card */}
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-400">
                  Question {currentQuestion + 1} of {totalQuestions}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                    {q.marks || 1} mark{(q.marks || 1) !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => toggleFlag(currentQuestion)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      flagged.has(currentQuestion)
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {flagged.has(currentQuestion) ? "Flagged" : "Flag"}
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">{q.question}</h2>

              <div className="space-y-3">
                {q.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => selectAnswer(currentQuestion, i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium ${
                      selectedAnswer === i
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${
                      selectedAnswer === i ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentQuestion((c) => Math.max(0, c - 1))}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {currentQuestion < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion((c) => c + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={status === "submitting"}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {status === "submitting" ? "Submitting..." : "Finish Quiz"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
