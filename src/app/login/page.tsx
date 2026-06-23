"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, LogIn, AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pick the post-login destination.
  // "next" is only honored for SPECIFIC pages — not "/" (the default) or "/login",
  // otherwise an admin bounced from "/" ends up back at "/" instead of "/admin".
  function destinationFor(role: "admin" | "user"): string {
    const hasSpecificNext = next && next !== "/" && next !== "/login";
    if (hasSpecificNext) return next!;
    return role === "admin" ? "/admin" : "/";
  }

  // If already signed in, hop straight to the right dashboard.
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.user) return;
        router.replace(destinationFor(d.user.role));
      })
      .catch(() => { /* show form */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Use this user's stable id as the client session id for new attempts.
      // Replaces the random localStorage UUID generated for anonymous sessions.
      if (data.user?.id) {
        localStorage.setItem("me_user_id", data.user.id);
        // Clear the legacy random UUID so it can't override us.
        localStorage.removeItem("quiz_session_id");
      }

      const role = data.user?.role === "admin" ? "admin" : "user";
      router.push(destinationFor(role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">QuizMaster</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-xs text-slate-400 text-center pt-2">
            Don&apos;t have an account? Ask the admin to create one for you.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
