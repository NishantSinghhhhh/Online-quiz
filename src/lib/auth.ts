import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  TOKEN_TTL_S,
  authCookieOptions,
} from "@/lib/auth-edge";

// ── Config ──────────────────────────────────────────────────
const JWT_ALG = "HS256";

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

/**
 * A constant bcrypt hash used to spend ~250ms on the "user not found" branch
 * of login, so an attacker can't distinguish "no such email" from "wrong password"
 * via response timing. The plaintext is irrelevant — what matters is that this
 * is a real bcrypt hash so `bcrypt.compare` does real work.
 */
const DUMMY_BCRYPT_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8.nL5HZsR4r1n8rJqMA9k6jH3PYBPe";

/** Burns ~250ms of CPU verifying against a fixed dummy hash. */
export async function dummyVerifyPassword(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_BCRYPT_HASH);
}

// ── Tokens ──────────────────────────────────────────────────
export interface TokenPayload {
  sub: string;       // user id
  email: string;
  role: "admin" | "user";
  name: string;
}

interface SignInput extends TokenPayload {
  tv: number;
  oiat: number;
}

/**
 * Sign a JWT for the given user. `oiat` is the original-issue timestamp
 * (login time); pass the same value on slide re-issues to preserve the
 * absolute-lifetime cap.
 */
export async function signToken(input: SignInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: input.email,
    role: input.role,
    name: input.name,
    tv: input.tv,
    oiat: input.oiat,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(input.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_S)
    .sign(getSecret());
}

interface VerifiedToken extends TokenPayload {
  tv: number;
  iat: number;
  oiat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role === "admin" ? "admin" : "user",
      name: String(payload.name ?? ""),
      // Pre-existing tokens (issued before tv/oiat existed) get safe defaults
      // so they keep working until natural expiry.
      tv: typeof payload.tv === "number" ? payload.tv : 0,
      iat: payload.iat,
      oiat: typeof payload.oiat === "number" ? payload.oiat : payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// ── Server-side helpers (RSC / route handlers) ──────────────

/**
 * Returns the current user, or null. Beyond verifying the JWT, this also
 * confirms the user still exists and that the token's `tv` matches
 * `User.tokenVersion` — bumping that column on the server-side invalidates
 * every existing session for that user.
 *
 * Costs one indexed PK lookup per call. RSC pages that call this from many
 * components will hit the DB once per call; if that becomes a hotspot, wrap
 * with `React.cache` at the call site (cache only works inside an RSC render).
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // DB check: user still exists, tokenVersion still matches. Soft-fail on DB
  // errors (return null = treat as unauth) rather than 500ing.
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true, role: true, name: true, email: true },
    });
    if (!user) return null;
    if (user.tokenVersion !== payload.tv) return null;
    // Use authoritative DB values for role/name/email — picks up role demotion
    // / profile updates without waiting for the user to re-login.
    return {
      sub: user.id,
      email: user.email,
      role: user.role === "admin" ? "admin" : "user",
      name: user.name,
    };
  } catch (err) {
    console.error("[auth.getCurrentUser] DB error", err);
    return null;
  }
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
  store.set(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export async function clearAuthCookie() {
  const store = await cookies();
  // Use a same-attribute expired cookie rather than .delete() so the browser
  // reliably overwrites the existing entry.
  store.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(), maxAge: 0 });
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

export { AUTH_COOKIE_NAME };
