import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryId, CATEGORIES } from "@/lib/categories";

// ── helpers ───────────────────────────────────────────────────
// All bucketing uses local-time calendar dates (NOT UTC) so a quiz
// taken at 1am IST gets bucketed into the user's "today", not yesterday.
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function localDateKey(d: Date) {
  // YYYY-MM-DD in the server's local timezone
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isoDay(d: Date) {
  return localDateKey(startOfDay(d));
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // make Monday the first day
  x.setDate(x.getDate() - diff);
  return x;
}
function isoWeek(d: Date) {
  return localDateKey(startOfWeek(d));
}

type Bucket = { count: number; score: number; total: number };
function bumpBucket(map: Map<string, Bucket>, key: string, score: number, total: number) {
  const cur = map.get(key) ?? { count: 0, score: 0, total: 0 };
  cur.count += 1;
  cur.score += score;
  cur.total += total;
  map.set(key, cur);
}

export async function GET() {
  try {
    const now = new Date();
    const since30 = new Date(now);
    since30.setDate(since30.getDate() - 29);
    since30.setHours(0, 0, 0, 0);

    const since12w = new Date(now);
    since12w.setDate(since12w.getDate() - 7 * 11);
    since12w.setHours(0, 0, 0, 0);

    // For streak, we need the union of *all* unique attempt dates ever
    // (not just within 12 weeks). Keep this query cheap — just dates.
    const [quizAttempts, vocabAttempts, grammarAttempts, totalQuizzes, totalQuizAttempts, perCategoryRaw, allAttemptDates] = await Promise.all([
      prisma.attempt.findMany({
        where: { completedAt: { gte: since12w } },
        select: { score: true, totalScore: true, completedAt: true, quiz: { select: { category: true } } },
      }),
      prisma.vocabAttempt.findMany({
        where: { completedAt: { gte: since12w } },
        select: { score: true, total: true, completedAt: true },
      }),
      prisma.grammarAttempt.findMany({
        where: { completedAt: { gte: since12w } },
        select: { score: true, total: true, completedAt: true },
      }),
      prisma.quiz.count({ where: { isRetry: false } }),
      prisma.attempt.count(),
      prisma.attempt.findMany({
        where: { completedAt: { gte: since30 } },
        select: { score: true, totalScore: true, answers: true, quiz: { select: { category: true, questions: true } } },
      }),
      // Just the date column from every kind of attempt, for streak math.
      Promise.all([
        prisma.attempt.findMany({ select: { completedAt: true } }),
        prisma.vocabAttempt.findMany({ select: { completedAt: true } }),
        prisma.grammarAttempt.findMany({ select: { completedAt: true } }),
      ]).then(([a, v, g]) => [...a, ...v, ...g].map(r => r.completedAt)),
    ]);

    // ── daily buckets (last 30 days) ──────────────────────────
    const daily = new Map<string, Bucket>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since30);
      d.setDate(since30.getDate() + i);
      daily.set(isoDay(d), { count: 0, score: 0, total: 0 });
    }
    const within30 = (d: Date) => d >= since30;
    for (const a of quizAttempts) if (within30(a.completedAt)) bumpBucket(daily, isoDay(a.completedAt), a.score, a.totalScore);
    for (const a of vocabAttempts) if (within30(a.completedAt)) bumpBucket(daily, isoDay(a.completedAt), a.score, a.total);
    for (const a of grammarAttempts) if (within30(a.completedAt)) bumpBucket(daily, isoDay(a.completedAt), a.score, a.total);

    // ── weekly buckets (last 12 weeks) ────────────────────────
    const weekly = new Map<string, Bucket>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(since12w);
      d.setDate(since12w.getDate() + i * 7);
      weekly.set(isoWeek(d), { count: 0, score: 0, total: 0 });
    }
    for (const a of quizAttempts) bumpBucket(weekly, isoWeek(a.completedAt), a.score, a.totalScore);
    for (const a of vocabAttempts) bumpBucket(weekly, isoWeek(a.completedAt), a.score, a.total);
    for (const a of grammarAttempts) bumpBucket(weekly, isoWeek(a.completedAt), a.score, a.total);

    // ── category breakdown (last 30d, quiz attempts only) ─────
    // Normalize legacy categories (e.g. "science" → "general") so chips match the UI.
    const byCategory = new Map<string, Bucket>();
    for (const a of perCategoryRaw) {
      const cat = normalizeCategoryId(a.quiz?.category);
      bumpBucket(byCategory, cat, a.score, a.totalScore);
    }

    // ── "where I'm doing wrong" — per-category question-level stats ─
    // Walk each attempt's answers vs the quiz's correct answers.
    type QStats = { answered: number; wrong: number; skipped: number; correct: number };
    const wrongByCategory = new Map<string, QStats>();
    for (const a of perCategoryRaw) {
      const cat = normalizeCategoryId(a.quiz?.category);
      const cur = wrongByCategory.get(cat) ?? { answered: 0, wrong: 0, skipped: 0, correct: 0 };
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questions: any[] = JSON.parse(a.quiz?.questions ?? "[]");
        const answers: Record<number, number | null> = JSON.parse(a.answers);
        questions.forEach((q, i) => {
          const sel = answers[i];
          if (sel === null || sel === undefined) cur.skipped += 1;
          else if (sel === q.correctAnswer) { cur.answered += 1; cur.correct += 1; }
          else { cur.answered += 1; cur.wrong += 1; }
        });
      } catch {/* skip malformed */}
      wrongByCategory.set(cat, cur);
    }

    const weakCategories = Array.from(wrongByCategory.entries())
      .map(([cat, s]) => ({
        category: cat,
        wrong: s.wrong,
        correct: s.correct,
        skipped: s.skipped,
        answered: s.answered,
        wrongRate: s.answered > 0 ? Math.round((s.wrong / s.answered) * 100) : 0,
      }))
      .filter(c => c.wrong > 0 || c.skipped > 0)
      .sort((a, b) => b.wrongRate - a.wrongRate);

    // ── weekly trend split by subject (12 weeks × N categories) ─
    // For each subject: { week → bucket }
    const weeklyBySubject = new Map<string, Map<string, Bucket>>();
    for (const cat of CATEGORIES) {
      const m = new Map<string, Bucket>();
      for (let i = 0; i < 12; i++) {
        const d = new Date(since12w);
        d.setDate(since12w.getDate() + i * 7);
        m.set(isoWeek(d), { count: 0, score: 0, total: 0 });
      }
      weeklyBySubject.set(cat.id, m);
    }
    for (const a of quizAttempts) {
      const cat = normalizeCategoryId(a.quiz?.category);
      const m = weeklyBySubject.get(cat);
      if (m) bumpBucket(m, isoWeek(a.completedAt), a.score, a.totalScore);
    }

    // Build per-subject percent-only series, dropping subjects with zero attempts in window
    const subjectTrends: Array<{
      subject: string;
      weeks: Array<{ key: string; percent: number | null; count: number }>;
    }> = [];
    for (const [subjectId, m] of weeklyBySubject.entries()) {
      const series = Array.from(m.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          key,
          count: v.count,
          // null when no attempts that week — recharts will skip the segment
          percent: v.total > 0 ? Math.round((v.score / v.total) * 100) : null,
        }));
      const totalCount = series.reduce((s, p) => s + p.count, 0);
      if (totalCount > 0) subjectTrends.push({ subject: subjectId, weeks: series });
    }

    // ── heatmap (GitHub-style) — last 26 weeks (~6 months) of daily attempt counts ─
    const heatmapWeeks = 26;
    const since26w = new Date(now);
    since26w.setDate(now.getDate() - 7 * heatmapWeeks + 1);
    since26w.setHours(0, 0, 0, 0);
    // Align to start of week (Monday)
    while (since26w.getDay() !== 1) since26w.setDate(since26w.getDate() - 1);

    const heatmap: Array<{ date: string; count: number }> = [];
    {
      const cursor = new Date(since26w);
      const end = new Date(now);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        heatmap.push({ date: isoDay(cursor), count: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const heatmapIndex = new Map(heatmap.map((d, i) => [d.date, i]));
    for (const d of allAttemptDates) {
      const k = isoDay(d);
      const idx = heatmapIndex.get(k);
      if (idx !== undefined) heatmap[idx].count += 1;
    }

    // ── streak (consecutive days with at least one attempt, ending today or yesterday) ─
    const uniqueDays = new Set<string>();
    for (const d of allAttemptDates) uniqueDays.add(isoDay(d));

    // Walk backwards from today; allow today to be skipped only if we haven't started yet.
    let currentStreak = 0;
    {
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      const todayKey = isoDay(cursor);
      const yesterday = new Date(cursor);
      yesterday.setDate(cursor.getDate() - 1);
      const yesterdayKey = isoDay(yesterday);
      // Streak still counts if user did attempts yesterday but not yet today
      let walking = false;
      if (uniqueDays.has(todayKey)) walking = true;
      else if (uniqueDays.has(yesterdayKey)) { walking = true; cursor.setDate(cursor.getDate() - 1); }
      while (walking) {
        const k = isoDay(cursor);
        if (uniqueDays.has(k)) {
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          walking = false;
        }
      }
    }

    // Best streak across all history
    let bestStreak = 0;
    {
      const sortedDays = Array.from(uniqueDays).sort();
      let run = 0;
      let prev: Date | null = null;
      for (const k of sortedDays) {
        const d = new Date(k + "T00:00:00");
        if (prev) {
          const diffDays = Math.round((d.getTime() - prev.getTime()) / 86400000);
          run = diffDays === 1 ? run + 1 : 1;
        } else {
          run = 1;
        }
        if (run > bestStreak) bestStreak = run;
        prev = d;
      }
    }

    const toSeries = (m: Map<string, Bucket>) =>
      Array.from(m.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          key,
          count: v.count,
          score: v.score,
          total: v.total,
          percent: v.total > 0 ? Math.round((v.score / v.total) * 100) : 0,
        }));

    // Overall totals
    const allScore = quizAttempts.reduce((s, a) => s + a.score, 0)
      + vocabAttempts.reduce((s, a) => s + a.score, 0)
      + grammarAttempts.reduce((s, a) => s + a.score, 0);
    const allTotal = quizAttempts.reduce((s, a) => s + a.totalScore, 0)
      + vocabAttempts.reduce((s, a) => s + a.total, 0)
      + grammarAttempts.reduce((s, a) => s + a.total, 0);

    // Today's metrics
    const today = isoDay(now);
    const todayBucket = daily.get(today) ?? { count: 0, score: 0, total: 0 };

    return NextResponse.json({
      summary: {
        totalQuizzes,
        totalQuizAttempts,
        last12wAttempts: quizAttempts.length + vocabAttempts.length + grammarAttempts.length,
        last12wScore: allScore,
        last12wTotal: allTotal,
        last12wPercent: allTotal > 0 ? Math.round((allScore / allTotal) * 100) : 0,
        todayAttempts: todayBucket.count,
        todayPercent: todayBucket.total > 0 ? Math.round((todayBucket.score / todayBucket.total) * 100) : 0,
        currentStreak,
        bestStreak,
        activeDays: uniqueDays.size,
      },
      daily: toSeries(daily),
      weekly: toSeries(weekly),
      byCategory: toSeries(byCategory),
      subjectTrends,
      heatmap,
      weakCategories,
    });
  } catch (err: unknown) {
    console.error("[/api/stats]", err);
    const msg = err instanceof Error ? err.message : "Failed to load stats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
