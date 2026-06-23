import { SignJWT, jwtVerify } from "jose";

// Edge-safe subset of auth.ts — used in middleware.ts.
// Does NOT import Prisma (which is incompatible with the edge runtime).

const AUTH_COOKIE = "qm_session";
const JWT_ALG = "HS256";
// Active-session TTL. Sized to comfortably outlast a 3h exam plus idle time
// before/after; sliding re-issue extends it on activity.
export const TOKEN_TTL_S = 12 * 60 * 60;
// Absolute cap from the first login — re-issue refuses past this and forces
// a real re-login.
export const ABSOLUTE_MAX_S = 30 * 24 * 60 * 60;
// Re-issue threshold: once a token is older than this, the next request gets a
// fresh one. Keeps the cookie fresh during long sessions without churning on
// every request.
export const SLIDING_REISSUE_S = 60 * 60;

export const AUTH_COOKIE_NAME = AUTH_COOKIE;

export interface EdgeTokenPayload {
  sub: string;
  email: string;
  role: "admin" | "user";
  name: string;
  tv: number;   // tokenVersion at sign time
  iat: number;  // seconds since epoch — when this particular token was minted
  oiat: number; // seconds since epoch — original login time (for absolute cap)
  exp: number;  // seconds since epoch
}

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

/** Verify a JWT and return the full payload (including iat/oiat). */
export async function verifyTokenEdge(token: string): Promise<EdgeTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;
    // tv and oiat were added later — fall back so pre-existing tokens still verify
    // (tv defaults to 0, matching User.tokenVersion's default; oiat falls back
    // to iat, so the absolute cap measures from the original issue time).
    const tv = typeof payload.tv === "number" ? payload.tv : 0;
    const oiat = typeof payload.oiat === "number" ? payload.oiat : payload.iat;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role === "admin" ? "admin" : "user",
      name: String(payload.name ?? ""),
      tv,
      iat: payload.iat,
      oiat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

interface SignInput {
  sub: string;
  email: string;
  role: "admin" | "user";
  name: string;
  tv: number;
  oiat: number;
}

/** Sign a token with the given oiat — used both at login (oiat=now) and on slide (oiat preserved). */
export async function signTokenEdge(input: SignInput): Promise<string> {
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

/** Cookie options applied at set + delete time. Kept here so middleware and
 *  node-side code can't drift. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_TTL_S,
  };
}
