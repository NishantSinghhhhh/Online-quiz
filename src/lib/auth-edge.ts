import { jwtVerify } from "jose";

// Edge-safe subset of auth.ts — used in middleware.ts.
// Does NOT import Prisma (which is incompatible with the edge runtime).

const AUTH_COOKIE = "qm_session";

export const AUTH_COOKIE_NAME = AUTH_COOKIE;

export interface EdgeTokenPayload {
  sub: string;
  email: string;
  role: "admin" | "user";
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET missing");
  return new TextEncoder().encode(secret);
}

export async function verifyTokenEdge(token: string): Promise<EdgeTokenPayload | null> {
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
