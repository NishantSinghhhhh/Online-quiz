import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, clearAuthCookie } from "@/lib/auth";

// Bump tokenVersion so every JWT minted before this moment fails its tv check
// on next server-side use. Use this when an account is suspected compromised,
// after a password change, or as a "sign out everywhere" affordance.
export async function POST() {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.update({
      where: { id: me.sub },
      data: { tokenVersion: { increment: 1 } },
    });
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/auth/logout-all]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
