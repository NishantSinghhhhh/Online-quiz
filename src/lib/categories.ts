import {
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  GraduationCap,
  Globe2,
  Landmark,
  Map,
  Scroll,
  TrendingUp,
  Newspaper,
  Brain,
  Hash,
  Plane,
  Wrench,
  Cpu,
  Zap,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

// ── Exams ───────────────────────────────────────────────────
export type ExamId = "afcat" | "cds";

export interface ExamMeta {
  id: ExamId;
  shortLabel: string;
  fullName: string;
  tagline: string;
  /** Tailwind gradient (hero cards) */
  gradient: string;
  /** Soft pill color */
  pillClasses: string;
  /** Hex color for charts */
  color: string;
  icon: LucideIcon;
}

export const EXAMS: ExamMeta[] = [
  {
    id: "afcat",
    shortLabel: "AFCAT",
    fullName: "Air Force Common Admission Test",
    tagline: "General Test (mandatory) + EKT (Technical Branch only)",
    gradient: "from-sky-500 to-indigo-700",
    pillClasses: "bg-sky-100 text-sky-700",
    color: "#0284c7",
    icon: Plane,
  },
  {
    id: "cds",
    shortLabel: "CDS",
    fullName: "Combined Defence Services Examination",
    tagline: "English, GS, and Maths — three independent papers",
    gradient: "from-emerald-600 to-teal-700",
    pillClasses: "bg-emerald-100 text-emerald-700",
    color: "#059669",
    icon: ShieldCheck,
  },
];

export function getExam(id: string | null | undefined): ExamMeta {
  return EXAMS.find(e => e.id === id) ?? EXAMS[1]; // default CDS
}

// ── Sections (an exam paper / sub-paper) ────────────────────
export type SectionId =
  | "afcat_general"
  | "afcat_ekt"
  | "cds_maths"
  | "cds_english"
  | "cds_gs";

export interface SectionMeta {
  id: SectionId;
  exam: ExamId;
  label: string;
  longLabel: string;
  tagline: string;
  /** "Numbers" shown on the section card */
  blueprint: {
    questions: number;
    timeLimit: number; // minutes
    totalMarks: number;
    positivePerQ: number;
    negativePerQ: number;
  } | null;
  gradient: string;
  pillClasses: string;
  color: string;
  icon: LucideIcon;
  /** Categories that belong to this section */
  categories: CategoryId[];
}

export const SECTIONS: SectionMeta[] = [
  // ── AFCAT ──
  {
    id: "afcat_general",
    exam: "afcat",
    label: "AFCAT General",
    longLabel: "AFCAT General Test",
    tagline: "Mandatory for all AFCAT candidates",
    blueprint: { questions: 100, timeLimit: 120, totalMarks: 300, positivePerQ: 3, negativePerQ: 1 },
    gradient: "from-sky-500 to-blue-600",
    pillClasses: "bg-sky-100 text-sky-700",
    color: "#0284c7",
    icon: Plane,
    categories: ["english", "general_awareness", "numerical_ability", "reasoning"],
  },
  {
    id: "afcat_ekt",
    exam: "afcat",
    label: "EKT",
    longLabel: "Engineering Knowledge Test",
    tagline: "Technical Branch candidates only",
    blueprint: { questions: 50, timeLimit: 45, totalMarks: 150, positivePerQ: 3, negativePerQ: 1 },
    gradient: "from-indigo-500 to-violet-600",
    pillClasses: "bg-indigo-100 text-indigo-700",
    color: "#6366f1",
    icon: Wrench,
    categories: ["cs", "ee", "mech"],
  },
  // ── CDS ──
  {
    id: "cds_maths",
    exam: "cds",
    label: "Maths",
    longLabel: "Mathematics",
    tagline: "Numerical · 1M per Q · 1/3 negative marking",
    blueprint: null,
    gradient: "from-blue-500 to-indigo-600",
    pillClasses: "bg-blue-100 text-blue-700",
    color: "#2563eb",
    icon: Calculator,
    categories: ["maths"],
  },
  {
    id: "cds_english",
    exam: "cds",
    label: "English",
    longLabel: "English",
    tagline: "Grammar · vocab · comprehension · 120Q / 100 marks",
    blueprint: null,
    gradient: "from-violet-500 to-fuchsia-600",
    pillClasses: "bg-violet-100 text-violet-700",
    color: "#7c3aed",
    icon: GraduationCap,
    categories: ["english"],
  },
  {
    id: "cds_gs",
    exam: "cds",
    label: "GS",
    longLabel: "General Studies",
    tagline: "Phy · Chem · Bio · Polity · Geo · History · 120Q / 100 marks",
    blueprint: null,
    gradient: "from-emerald-500 to-teal-600",
    pillClasses: "bg-emerald-100 text-emerald-700",
    color: "#059669",
    icon: Globe2,
    categories: ["physics", "chemistry", "biology", "polity", "geography", "history", "economics", "current_affairs", "general"],
  },
];

export function getSection(id: string | null | undefined): SectionMeta {
  const found = SECTIONS.find(s => s.id === id);
  return found ?? SECTIONS[2]; // default cds_maths
}

export function sectionsForExam(exam: ExamId): SectionMeta[] {
  return SECTIONS.filter(s => s.exam === exam);
}

// ── Categories (subjects within sections) ───────────────────
export type CategoryId =
  // CDS Maths / CDS English share these
  | "maths"
  | "english"
  // CDS GS
  | "physics"
  | "chemistry"
  | "biology"
  | "polity"
  | "geography"
  | "history"
  | "economics"
  | "current_affairs"
  | "general"
  // AFCAT General Test
  | "general_awareness"
  | "numerical_ability"
  | "reasoning"
  // AFCAT EKT
  | "cs"
  | "ee"
  | "mech";

export interface CategoryMeta {
  id: CategoryId;
  /** Short label (chips, tabs) */
  label: string;
  /** Long label (headings, page titles) */
  longLabel: string;
  /** Label used on full-mock subject cards */
  mockLabel?: string;
  /** Hex color for charts */
  color: string;
  /** Tailwind classes for solid pill / badge */
  pillClasses: string;
  /** Tailwind classes for outline pill */
  outlineClasses: string;
  /** Tailwind gradient (for hero cards) */
  gradient: string;
  icon: LucideIcon;
  /** Admin subject hub URL (legacy — kept for /admin/[subject] route) */
  href: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "maths",
    label: "Maths",
    longLabel: "Mathematics",
    mockLabel: "Maths Mock",
    color: "#2563eb",
    pillClasses: "bg-blue-100 text-blue-700",
    outlineClasses: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-500",
    gradient: "from-blue-500 to-indigo-500",
    icon: Calculator,
    href: "/admin/maths",
  },
  {
    id: "english",
    label: "English",
    longLabel: "English",
    mockLabel: "English Mock",
    color: "#7c3aed",
    pillClasses: "bg-violet-100 text-violet-700",
    outlineClasses: "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-500",
    gradient: "from-violet-500 to-fuchsia-500",
    icon: GraduationCap,
    href: "/admin/english",
  },
  // ── CDS GS ──
  { id: "physics", label: "Physics", longLabel: "Physics", color: "#0284c7", pillClasses: "bg-sky-100 text-sky-700", outlineClasses: "bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-500", gradient: "from-sky-500 to-cyan-500", icon: Atom, href: "/admin/physics" },
  { id: "chemistry", label: "Chemistry", longLabel: "Chemistry", color: "#059669", pillClasses: "bg-emerald-100 text-emerald-700", outlineClasses: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-500", gradient: "from-emerald-500 to-teal-500", icon: FlaskConical, href: "/admin/chemistry" },
  { id: "biology", label: "Biology", longLabel: "Biology", color: "#16a34a", pillClasses: "bg-green-100 text-green-700", outlineClasses: "bg-green-50 text-green-700 border-green-200 hover:border-green-500", gradient: "from-green-500 to-lime-500", icon: Leaf, href: "/admin/biology" },
  { id: "polity", label: "Polity", longLabel: "Polity & Civics", color: "#dc2626", pillClasses: "bg-red-100 text-red-700", outlineClasses: "bg-red-50 text-red-700 border-red-200 hover:border-red-500", gradient: "from-red-500 to-rose-500", icon: Landmark, href: "/admin/polity" },
  { id: "geography", label: "Geography", longLabel: "Geography", color: "#0891b2", pillClasses: "bg-cyan-100 text-cyan-700", outlineClasses: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-500", gradient: "from-cyan-500 to-blue-500", icon: Map, href: "/admin/geography" },
  { id: "history", label: "History", longLabel: "History", color: "#ca8a04", pillClasses: "bg-yellow-100 text-yellow-700", outlineClasses: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-500", gradient: "from-yellow-500 to-amber-500", icon: Scroll, href: "/admin/history" },
  { id: "economics", label: "Economics", longLabel: "Economics", color: "#9333ea", pillClasses: "bg-purple-100 text-purple-700", outlineClasses: "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-500", gradient: "from-purple-500 to-fuchsia-500", icon: TrendingUp, href: "/admin/economics" },
  { id: "current_affairs", label: "Current Affairs", longLabel: "Current Affairs", color: "#ea580c", pillClasses: "bg-orange-100 text-orange-700", outlineClasses: "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-500", gradient: "from-orange-500 to-red-500", icon: Newspaper, href: "/admin/current_affairs" },
  { id: "general", label: "General", longLabel: "General Studies (misc)", mockLabel: "GS Mock", color: "#64748b", pillClasses: "bg-slate-100 text-slate-700", outlineClasses: "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400", gradient: "from-slate-500 to-zinc-500", icon: Globe2, href: "/admin/general" },
  // ── AFCAT General Test ──
  { id: "general_awareness", label: "General Awareness", longLabel: "General Awareness (AFCAT)", color: "#0891b2", pillClasses: "bg-teal-100 text-teal-700", outlineClasses: "bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-500", gradient: "from-teal-500 to-emerald-500", icon: Globe2, href: "/admin/general_awareness" },
  { id: "numerical_ability", label: "Numerical Ability", longLabel: "Numerical Ability (AFCAT)", color: "#2563eb", pillClasses: "bg-blue-100 text-blue-700", outlineClasses: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-500", gradient: "from-blue-500 to-indigo-500", icon: Hash, href: "/admin/numerical_ability" },
  { id: "reasoning", label: "Reasoning", longLabel: "Reasoning & Military Aptitude", color: "#7c3aed", pillClasses: "bg-violet-100 text-violet-700", outlineClasses: "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-500", gradient: "from-violet-500 to-purple-500", icon: Brain, href: "/admin/reasoning" },
  // ── AFCAT EKT ──
  { id: "cs", label: "Computer Science", longLabel: "Computer Science (EKT)", color: "#0284c7", pillClasses: "bg-sky-100 text-sky-700", outlineClasses: "bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-500", gradient: "from-sky-500 to-blue-500", icon: Cpu, href: "/admin/cs" },
  { id: "ee", label: "Electronics & Electrical", longLabel: "Electronics & Electrical (EKT)", color: "#ca8a04", pillClasses: "bg-yellow-100 text-yellow-700", outlineClasses: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-500", gradient: "from-yellow-500 to-amber-500", icon: Zap, href: "/admin/ee" },
  { id: "mech", label: "Mechanical", longLabel: "Mechanical Engineering (EKT)", color: "#dc2626", pillClasses: "bg-red-100 text-red-700", outlineClasses: "bg-red-50 text-red-700 border-red-200 hover:border-red-500", gradient: "from-red-500 to-rose-500", icon: Wrench, href: "/admin/mech" },
];

// ── Lookup ───────────────────────────────────────────────────
const ALIASES: Record<string, CategoryId> = {
  science: "general",
  math: "maths",
  mathematics: "maths",
  gs: "general",
  "general studies": "general",
};

export function normalizeCategoryId(raw: string | null | undefined): CategoryId {
  if (!raw) return "general";
  const lower = raw.toLowerCase();
  if (CATEGORIES.some(c => c.id === lower)) return lower as CategoryId;
  if (lower in ALIASES) return ALIASES[lower];
  return "general";
}

export function getCategory(id: string | null | undefined): CategoryMeta {
  const normalized = normalizeCategoryId(id);
  return CATEGORIES.find(c => c.id === normalized)!;
}

/** All categories within a given section */
export function categoriesForSection(sectionId: SectionId): CategoryMeta[] {
  const section = SECTIONS.find(s => s.id === sectionId);
  if (!section) return [];
  return section.categories.map(id => CATEGORIES.find(c => c.id === id)!).filter(Boolean);
}

/** Backwards-compat: a category's "primary" section (used by legacy /admin/[subject] route) */
export function sectionOfCategory(id: string | null | undefined): SectionId {
  const cat = getCategory(id);
  const section = SECTIONS.find(s => s.categories.includes(cat.id));
  return section?.id ?? "cds_gs";
}

export const VALID_CATEGORY_IDS = CATEGORIES.map(c => c.id);
export const VALID_SECTION_IDS = SECTIONS.map(s => s.id);
export const VALID_EXAM_IDS = EXAMS.map(e => e.id);

// Subjects that can have a full-mock paper
export const MOCK_CATEGORIES = CATEGORIES.filter(c => c.mockLabel);

// ── Negative marking ────────────────────────────────────────
// Universal: 1/3 of question marks subtracted for each wrong answer.
// AFCAT (+3/-1), EKT (+3/-1), and CDS sections all match this ratio.
// Skipped questions are unscored (no penalty).
export const NEGATIVE_MARK_RATIO = 1 / 3;

// Re-export Trophy for components that import lucide via this module
export { Trophy };
