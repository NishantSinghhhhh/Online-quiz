"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  TrendingUp,
  Activity,
  Award,
  CalendarDays,
  BarChart3,
  Trophy,
  PieChart as PieIcon,
  Flame,
  LineChart as LineChartIcon,
  Grid3x3,
  AlertTriangle,
} from "lucide-react";
import { getCategory, CATEGORIES, type CategoryId } from "@/lib/categories";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  LineChart,
} from "recharts";

interface SeriesPoint {
  key: string;
  count: number;
  score: number;
  total: number;
  percent: number;
}

interface SubjectTrend {
  subject: CategoryId;
  weeks: Array<{ key: string; percent: number | null; count: number }>;
}

interface HeatmapDay {
  date: string;
  count: number;
}

interface WeakCategory {
  category: string;
  wrong: number;
  correct: number;
  skipped: number;
  answered: number;
  wrongRate: number;
}

interface StatsResponse {
  summary: {
    totalQuizzes: number;
    totalQuizAttempts: number;
    last12wAttempts: number;
    last12wScore: number;
    last12wTotal: number;
    last12wPercent: number;
    todayAttempts: number;
    todayPercent: number;
    currentStreak: number;
    bestStreak: number;
    activeDays: number;
  };
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  byCategory: SeriesPoint[];
  subjectTrends: SubjectTrend[];
  heatmap: HeatmapDay[];
  weakCategories: WeakCategory[];
}

function formatDayShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
function formatDayLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function formatWeekShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
function formatWeekLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const end = new Date(d); end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

// ── Custom tooltip ───────────────────────────────────────────
interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: ChartPoint;
  dataKey?: string;
}
interface ChartPoint {
  rawKey: string;
  label: string;
  fullLabel: string;
  count: number;
  percent: number;
  score: number;
  total: number;
}
function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700 min-w-[140px]">
      <p className="font-semibold mb-1">{p.fullLabel}</p>
      <div className="space-y-0.5">
        <p>Attempts: <span className="font-semibold">{p.count}</span></p>
        {p.total > 0 ? (
          <>
            <p>Score: <span className="font-semibold">{p.score}/{p.total}</span></p>
            <p>Avg: <span className="font-semibold text-emerald-300">{p.percent}%</span></p>
          </>
        ) : (
          <p className="text-slate-400 text-[10px]">No attempts</p>
        )}
      </div>
    </div>
  );
}

interface CategoryPoint {
  name: string;
  rawKey: string;
  count: number;
  percent: number;
  score: number;
  total: number;
  color: string;
}
function CategoryTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as unknown as CategoryPoint;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700 min-w-[140px]">
      <p className="font-semibold mb-1">{p.name}</p>
      <p>Attempts: <span className="font-semibold">{p.count}</span></p>
      <p>Score: <span className="font-semibold">{p.score}/{p.total}</span></p>
      <p>Avg: <span className="font-semibold text-emerald-300">{p.percent}%</span></p>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load stats");
        setStats(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  // Pre-shape data for recharts (label fields used by axes & tooltip)
  const dailyData: ChartPoint[] = useMemo(() => (stats?.daily ?? []).map(d => ({
    rawKey: d.key,
    label: formatDayShort(d.key),
    fullLabel: formatDayLong(d.key),
    count: d.count,
    percent: d.percent,
    score: d.score,
    total: d.total,
  })), [stats]);

  const weeklyData: ChartPoint[] = useMemo(() => (stats?.weekly ?? []).map(d => ({
    rawKey: d.key,
    label: formatWeekShort(d.key),
    fullLabel: `Week of ${formatWeekLong(d.key)}`,
    count: d.count,
    percent: d.percent,
    score: d.score,
    total: d.total,
  })), [stats]);

  const categoryData = useMemo(() => (stats?.byCategory ?? []).map(d => {
    const cat = getCategory(d.key);
    return {
      name: cat.label,
      rawKey: cat.id,
      count: d.count,
      percent: d.percent,
      score: d.score,
      total: d.total,
      color: cat.color,
    };
  }), [stats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stats & Analytics</h1>
            <p className="text-slate-500">Daily, weekly, and category-wise performance</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
            <div className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>
        ) : stats ? (
          <>
            {/* Streak hero (full-width) */}
            <StreakCard
              currentStreak={stats.summary.currentStreak}
              bestStreak={stats.summary.bestStreak}
              activeDays={stats.summary.activeDays}
              todayAttempts={stats.summary.todayAttempts}
            />

            {/* GitHub-style heatmap */}
            <ChartCard
              title="Activity heatmap (last 26 weeks)"
              subtitle="Each square = one day · darker = more attempts"
              icon={<Grid3x3 className="w-4 h-4 text-emerald-600" />}
            >
              <Heatmap data={stats.heatmap} />
            </ChartCard>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard icon={Award} color="indigo" label="Total Quizzes" value={stats.summary.totalQuizzes} />
              <SummaryCard icon={Activity} color="emerald" label="Total Attempts" value={stats.summary.totalQuizAttempts} />
              <SummaryCard
                icon={CalendarDays}
                color="violet"
                label="Today"
                value={stats.summary.todayAttempts}
                subtitle={stats.summary.todayAttempts > 0 ? `Avg ${stats.summary.todayPercent}%` : "No attempts yet"}
              />
              <SummaryCard
                icon={Trophy}
                color="amber"
                label="Last 12 weeks"
                value={`${stats.summary.last12wPercent}%`}
                subtitle={`${stats.summary.last12wScore}/${stats.summary.last12wTotal} marks`}
              />
            </div>

            {/* Daily — composed chart: bars for attempts + line for % */}
            <ChartCard
              title="Daily activity & performance (last 30 days)"
              subtitle="Bars = attempts · Line = avg score %"
              icon={<Activity className="w-4 h-4 text-indigo-600" />}
            >
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      interval={Math.max(0, Math.floor(dailyData.length / 10) - 1)}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      label={{ value: "Attempts", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748b" } }}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      domain={[0, 100]}
                      label={{ value: "Score %", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "#64748b" } }}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                    <Bar yAxisId="left" dataKey="count" name="Attempts" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="percent"
                      name="Avg score %"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Weekly — area for attempts */}
            <ChartCard
              title="Weekly attempts (last 12 weeks)"
              subtitle="Week starts Monday"
              icon={<BarChart3 className="w-4 h-4 text-indigo-600" />}
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="weeklyArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      allowDecimals={false}
                      label={{ value: "Attempts", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748b" } }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Attempts"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#weeklyArea)"
                      dot={{ r: 3, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Weekly percent area */}
            <ChartCard
              title="Weekly average score %"
              subtitle="Only weeks with attempts contribute"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="percentArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="percent"
                      name="Avg %"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#percentArea)"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Where I'm doing wrong — weak categories */}
            <ChartCard
              title="Where you're doing wrong"
              subtitle="Subjects ranked by wrong-answer rate (last 30 days)"
              icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
            >
              <WeakCategoriesList items={stats.weakCategories} />
            </ChartCard>

            {/* Per-subject accuracy trend */}
            <ChartCard
              title="Avg score % by subject (last 12 weeks)"
              subtitle="One line per subject — spot which subjects are improving or slipping"
              icon={<LineChartIcon className="w-4 h-4 text-indigo-600" />}
            >
              {stats.subjectTrends.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                  No quiz attempts yet — take a few quizzes to see subject trends.
                </div>
              ) : (
                <SubjectTrendChart trends={stats.subjectTrends} />
              )}
            </ChartCard>

            {/* Category — split into pie + horizontal bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard
                title="Attempts by category"
                subtitle="Last 30 days"
                icon={<PieIcon className="w-4 h-4 text-violet-600" />}
                noMargin
              >
                <div className="h-72 w-full">
                  {categoryData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No attempts in the last 30 days.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={2}
                          label={(props) => {
                            const name = (props as { name?: string }).name ?? "";
                            const percent = (props as { percent?: number }).percent ?? 0;
                            return `${name} ${(percent * 100).toFixed(0)}%`;
                          }}
                          labelLine={false}
                        >
                          {categoryData.map((entry) => (
                            <Cell key={entry.rawKey} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CategoryTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>

              <ChartCard
                title="Avg score % by category"
                subtitle="Last 30 days"
                icon={<Trophy className="w-4 h-4 text-amber-600" />}
                noMargin
              >
                <div className="h-72 w-full">
                  {categoryData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No attempts in the last 30 days.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={{ stroke: "#cbd5e1" }}
                          unit="%"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={{ stroke: "#cbd5e1" }}
                          width={90}
                        />
                        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
                        <Bar dataKey="percent" name="Avg %" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {categoryData.map((entry) => (
                            <Cell key={entry.rawKey} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "indigo" | "emerald" | "violet" | "amber";
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-100",  fg: "text-indigo-600" },
    emerald: { bg: "bg-emerald-100", fg: "text-emerald-600" },
    violet:  { bg: "bg-violet-100",  fg: "text-violet-600" },
    amber:   { bg: "bg-amber-100",   fg: "text-amber-600" },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.fg}`} />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  noMargin,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  noMargin?: boolean;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 ${noMargin ? "" : "mb-6"}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {subtitle ? (
        <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </div>
  );
}

// ── Streak hero card ─────────────────────────────────────────
function StreakCard({
  currentStreak,
  bestStreak,
  activeDays,
  todayAttempts,
}: {
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
  todayAttempts: number;
}) {
  const done = todayAttempts > 0;
  const message =
    currentStreak === 0
      ? "Take a quiz today to start a streak!"
      : done
      ? `🎉 You're on a ${currentStreak}-day streak — keep it going tomorrow!`
      : `🔥 Don't break your ${currentStreak}-day streak — do at least 1 quiz today.`;

  return (
    <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 text-white rounded-2xl p-6 mb-6 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center ${currentStreak > 0 ? "animate-pulse" : ""}`}>
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Current streak</p>
            <p className="text-4xl font-bold leading-tight">
              {currentStreak} <span className="text-lg font-medium opacity-90">day{currentStreak !== 1 ? "s" : ""}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 md:border-l md:border-white/20 md:pl-6">
          <p className="text-sm md:text-base font-medium leading-snug mb-3">{message}</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="bg-white/15 rounded-lg px-3 py-1.5">
              <span className="opacity-75">Best streak: </span>
              <strong>{bestStreak} day{bestStreak !== 1 ? "s" : ""}</strong>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-1.5">
              <span className="opacity-75">Active days total: </span>
              <strong>{activeDays}</strong>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-1.5">
              <span className="opacity-75">Today: </span>
              <strong>{todayAttempts} attempt{todayAttempts !== 1 ? "s" : ""}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GitHub-style activity heatmap ────────────────────────────
function Heatmap({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No data.</p>;

  // Group days into weeks (columns). data is in chronological order starting Monday.
  const columns: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    columns.push(data.slice(i, i + 7));
  }

  // Color scale (GitHub palette, green)
  const max = Math.max(1, ...data.map(d => d.count));
  function colorFor(count: number) {
    if (count === 0) return "#ebedf0";
    const level = count / max;
    if (level > 0.75) return "#216e39";
    if (level > 0.5) return "#30a14e";
    if (level > 0.25) return "#40c463";
    return "#9be9a8";
  }

  // Month labels (show month name when month changes)
  const monthLabels: Array<{ index: number; label: string }> = [];
  let lastMonth = -1;
  columns.forEach((week, i) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const m = new Date(firstDay.date + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthLabels.push({
        index: i,
        label: new Date(firstDay.date + "T00:00:00").toLocaleDateString(undefined, { month: "short" }),
      });
    }
  });

  const totalAttempts = data.reduce((s, d) => s + d.count, 0);
  const activeDays = data.filter(d => d.count > 0).length;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span><strong className="text-slate-900">{totalAttempts}</strong> attempts</span>
        <span><strong className="text-slate-900">{activeDays}</strong> active days</span>
        <span className="ml-auto flex items-center gap-1.5">
          Less
          <span className="flex gap-0.5">
            {["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"].map((c) => (
              <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </span>
          More
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex gap-0.5 mb-1 ml-7 text-[10px] text-slate-500" style={{ height: 14 }}>
            {columns.map((_, i) => {
              const label = monthLabels.find(m => m.index === i)?.label;
              return (
                <div key={i} style={{ width: 12 }} className="shrink-0">
                  {label && <span className="block whitespace-nowrap">{label}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-0.5 mr-1 text-[10px] text-slate-500" style={{ width: 24 }}>
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                <div key={i} style={{ height: 12 }} className="flex items-center">{d}</div>
              ))}
            </div>
            {/* Squares grid */}
            <div className="flex gap-0.5">
              {columns.map((week, ci) => (
                <div key={ci} className="flex flex-col gap-0.5">
                  {Array.from({ length: 7 }).map((_, ri) => {
                    const day = week[ri];
                    if (!day) {
                      return <div key={ri} style={{ width: 12, height: 12 }} />;
                    }
                    const friendly = new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    });
                    return (
                      <div
                        key={ri}
                        title={`${friendly}: ${day.count} attempt${day.count !== 1 ? "s" : ""}`}
                        className="rounded-[2px] hover:ring-1 hover:ring-slate-400 transition-all cursor-pointer"
                        style={{ width: 12, height: 12, backgroundColor: colorFor(day.count) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Weak categories list ──────────────────────────────────────
function WeakCategoriesList({ items }: { items: WeakCategory[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        🎉 No wrong answers in the last 30 days — keep it up!
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((w) => {
        const cat = getCategory(w.category);
        const Icon = cat.icon;
        return (
          <div key={w.category} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.pillClasses}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-900">{cat.label}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{w.wrongRate}%</div>
                <div className="text-xs text-slate-400">wrong rate</div>
              </div>
            </div>

            {/* Stacked bar: correct / wrong / skipped */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              {w.correct > 0 && (
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(w.correct / Math.max(1, w.correct + w.wrong + w.skipped)) * 100}%` }}
                  title={`${w.correct} correct`}
                />
              )}
              {w.wrong > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(w.wrong / Math.max(1, w.correct + w.wrong + w.skipped)) * 100}%` }}
                  title={`${w.wrong} wrong`}
                />
              )}
              {w.skipped > 0 && (
                <div
                  className="bg-slate-300"
                  style={{ width: `${(w.skipped / Math.max(1, w.correct + w.wrong + w.skipped)) * 100}%` }}
                  title={`${w.skipped} skipped`}
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-emerald-600">✓ {w.correct} correct</span>
                <span className="text-red-600">✗ {w.wrong} wrong</span>
                {w.skipped > 0 && <span className="text-slate-400">○ {w.skipped} skipped</span>}
              </div>
              <Link
                href="/review"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Practice these →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Per-subject trend chart ──────────────────────────────────
function SubjectTrendChart({ trends }: { trends: SubjectTrend[] }) {
  // Merge all weeks across subjects into one row-per-week table
  // Each row: { label: "12 May", maths: 84, physics: null, ... }
  const allWeeks = Array.from(
    new Set(trends.flatMap(t => t.weeks.map(w => w.key)))
  ).sort();

  const data = allWeeks.map(weekKey => {
    const d = new Date(weekKey + "T00:00:00");
    const row: Record<string, string | number | null> = {
      key: weekKey,
      label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
    };
    for (const t of trends) {
      const w = t.weeks.find(x => x.key === weekKey);
      row[t.subject] = w?.percent ?? null;
    }
    return row;
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
              color: "#fff",
            }}
            labelStyle={{ color: "#cbd5e1", marginBottom: 4 }}
            itemStyle={{ color: "#fff" }}
            formatter={(value, name) => {
              const v = value as number | null | undefined;
              const n = String(name);
              if (v === null || v === undefined) return ["—", n];
              return [`${v}%`, getCategory(n).label];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            formatter={(v: string) => getCategory(v).label}
          />
          {trends.map(t => {
            const cat = CATEGORIES.find(c => c.id === t.subject)!;
            return (
              <Line
                key={t.subject}
                type="monotone"
                dataKey={t.subject}
                stroke={cat.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: cat.color, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
