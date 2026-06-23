import { NextRequest, NextResponse } from "next/server";
import {
  verifyTokenEdge,
  signTokenEdge,
  authCookieOptions,
  AUTH_COOKIE_NAME,
  ABSOLUTE_MAX_S,
  SLIDING_REISSUE_S,
} from "@/lib/auth-edge";

// Routes that don't require authentication.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/_next",
  "/favicon.ico",
];

// Admin-only routes.
// Anything under /admin/* (except /admin/create — handled separately below) is
// admin-only. API mutations and AI endpoints (which cost money) are also locked
// down. Per-route handlers also call requireAdmin() as defense-in-depth in case
// the proxy is ever bypassed (e.g. running on a host that doesn't honour it).
const ADMIN_ONLY_PATHS = [
  "/admin",          // covers /admin and every /admin/* page
  "/api/users",      // create / delete / reset
  "/api/ai",         // expensive AI calls — only admins generate content
];

function isPublic(pathname: string) {
  // Exact match OR descendant. Note: we deliberately do NOT use plain
  // `startsWith(p)` — that would match `/loginhack`, `/_nextfoo`, etc.
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function isAdminOnly(pathname: string) {
  return ADMIN_ONLY_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function unauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  // If the cookie is present-but-bad (expired, tampered, past the 30d cap),
  // clear it so the client doesn't loop on it.
  res.cookies.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(), maxAge: 0 });
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifyTokenEdge(token) : null;

  if (!user) return unauthorized(req);

  // Absolute lifetime cap from the original login. Re-issue refuses past this,
  // so a forever-active user is still forced through a real re-login after 30d.
  const nowS = Math.floor(Date.now() / 1000);
  if (nowS - user.oiat > ABSOLUTE_MAX_S) return unauthorized(req);

  if (isAdminOnly(pathname) && user.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();

  // Sliding re-issue: if the active token is older than the threshold, mint
  // a fresh one so the cookie keeps rolling forward on every active hour.
  // We can't check tokenVersion at the edge (no Prisma) — server-side
  // getCurrentUser() does that. The edge layer just keeps the cookie fresh.
  if (nowS - user.iat > SLIDING_REISSUE_S) {
    try {
      const fresh = await signTokenEdge({
        sub: user.sub,
        email: user.email,
        role: user.role,
        name: user.name,
        tv: user.tv,
        oiat: user.oiat, // preserved across slides
      });
      res.cookies.set(AUTH_COOKIE_NAME, fresh, authCookieOptions());
    } catch (err) {
      // Don't fail the request if re-issue fails — the existing token is still
      // valid until exp; we'll try again next request.
      console.error("[proxy] sliding re-issue failed", err);
    }
  }

  return res;
}

// Match everything except Next internals + static files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
