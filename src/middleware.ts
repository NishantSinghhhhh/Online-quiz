import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge, AUTH_COOKIE_NAME } from "@/lib/auth-edge";

// Routes that don't require authentication.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/_next",
  "/favicon.ico",
];

// Admin-only routes (besides the implicit /admin/*).
const ADMIN_ONLY_PATHS = ["/admin/users", "/api/users"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

function isAdminOnly(pathname: string) {
  return ADMIN_ONLY_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifyTokenEdge(token) : null;

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminOnly(pathname) && user.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match everything except Next internals + static files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
