import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUser, getCurrentUser } from "@/lib/auth";

// GET: list users (admin only — enforced in middleware as well)
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

// POST: create a new user
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    const user = await createUser({
      name: String(name),
      email: String(email),
      password: String(password),
      role: role === "admin" ? "admin" : "user",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
