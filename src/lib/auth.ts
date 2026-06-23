import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// ── Config ──────────────────────────────────────────────────
const AUTH_COOKIE = "qm_session";
const TOKEN_TTL = "30d";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET environment variable is missing or too short. " +
      "Set it to a random string of at least 32 characters in .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

// ── Password hashing ────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Tokens ──────────────────────────────────────────────────
export interface TokenPayload {
  sub: string;       // user id
  email: string;
  role: "admin" | "user";
  name: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role === "admin" ? "admin" : "user",
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

// ── Server-side helpers (RSC / route handlers) ──────────────
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Throws redirect to /login if not authenticated. Use in RSC pages. */
export async function requireUser(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Throws redirect to /login if not admin. */
export async function requireAdmin(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return user;
}

// ── Cookie management ──────────────────────────────────────
export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}

// ── DB helpers ─────────────────────────────────────────────
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user";
}) {
  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "user",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export const AUTH_COOKIE_NAME = AUTH_COOKIE;
