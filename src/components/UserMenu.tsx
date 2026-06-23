"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Target,
  LogOut,
  ShieldCheck,
  Users as UsersIcon,
  ChevronDown,
} from "lucide-react";
import { useMe, clearMeCache } from "@/lib/use-me";

interface UserMenuProps {
  /** "indigo" (student look) or "amber" (admin look) — affects avatar color */
  variant?: "student" | "admin";
}

export function UserMenu({ variant = "student" }: UserMenuProps) {
  const router = useRouter();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("me_user_id");
    localStorage.removeItem("active_exam");
    localStorage.removeItem("active_section");
    localStorage.removeItem("admin_active_exam");
    localStorage.removeItem("admin_active_section");
    clearMeCache();
    router.push("/login");
  }

  if (!me) return null;

  const avatarGradient =
    variant === "admin"
      ? "from-amber-500 to-orange-600"
      : "from-indigo-500 to-violet-600";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-3 border-l border-slate-200 hover:opacity-80 transition-opacity"
      >
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center font-bold text-sm`}>
          {me.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:inline">{me.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20">
          <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center font-bold`}>
                {me.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{me.name}</p>
                <p className="text-xs text-slate-500 truncate">{me.email}</p>
              </div>
            </div>
            {me.role === "admin" && (
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> ADMIN
              </span>
            )}
          </div>

          <nav className="py-1">
            <MenuItem href="/stats" icon={BarChart3} label="My Stats" desc="Heatmap · streak · weak areas" onSelect={() => setOpen(false)} />
            <MenuItem href="/review" icon={Target} label="Review Mistakes" desc="Wrong answers · practice" onSelect={() => setOpen(false)} />
            {me.role === "admin" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <MenuItem href="/admin" icon={ShieldCheck} label="Admin Dashboard" desc="Manage quizzes" onSelect={() => setOpen(false)} />
                <MenuItem href="/admin/users" icon={UsersIcon} label="Manage Users" desc="Create · reset · delete" onSelect={() => setOpen(false)} />
              </>
            )}
            <div className="my-1 border-t border-slate-100" />
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Sign out</p>
                <p className="text-xs text-red-400">End this session</p>
              </div>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href, icon: Icon, label, desc, onSelect,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 truncate">{desc}</p>
      </div>
    </Link>
  );
}
