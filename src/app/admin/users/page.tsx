"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  Users,
  Plus,
  Trash2,
  KeyRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Self
  const [me, setMe] = useState<{ id: string } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([usersRes, meRes]) => {
      if (Array.isArray(usersRes.users)) setUsers(usersRes.users);
      if (meRes.user) setMe({ id: meRes.user.id });
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setSuccess(`User "${newName}" created`);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("user");
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to delete"); return; }
    setSuccess(`User "${user.name}" deleted`);
    load();
  }

  async function handleResetPassword() {
    if (!resetUser) return;
    if (resetPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setResetting(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess(`Password reset for "${resetUser.name}"`);
      setResetUser(null);
      setResetPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleRoleToggle(user: User) {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Change ${user.name}'s role to ${newRole}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setSuccess(`${user.name} is now ${newRole}`);
    load();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuizMaster Admin</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-500">Manage who can sign in to QuizMaster</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError("")} className="text-xs text-red-600 hover:text-red-700">dismiss</button>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700 flex-1">{success}</p>
            <button onClick={() => setSuccess("")} className="text-xs text-emerald-600 hover:text-emerald-700">dismiss</button>
          </div>
        )}

        {/* Create form (modal-ish inline panel) */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-3">
            <h2 className="font-bold text-slate-900 mb-2">Create new user</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Full name" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} required type="email" placeholder="email@example.com" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} required type="password" placeholder="Password (min 8 chars)" minLength={8} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "user")} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={creating} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        )}

        {/* Reset password modal */}
        {resetUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={() => setResetUser(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="font-bold text-lg text-slate-900 mb-1">Reset password</h2>
              <p className="text-sm text-slate-500 mb-4">Set a new password for <strong>{resetUser.name}</strong></p>
              <input
                type="password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                minLength={8}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setResetUser(null); setResetPassword(""); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={handleResetPassword} disabled={resetting || resetPassword.length < 8} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No users yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white ${u.role === "admin" ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-slate-500 to-slate-700"}`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      {u.role === "admin" && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> ADMIN
                        </span>
                      )}
                      {me?.id === u.id && (
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">YOU</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setResetUser(u); setResetPassword(""); setError(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Reset password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {me?.id !== u.id && (
                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        title={`Make ${u.role === "admin" ? "regular user" : "admin"}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {me?.id !== u.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
