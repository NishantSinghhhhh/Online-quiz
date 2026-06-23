import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  verifyPassword,
  dummyVerifyPassword,
  signToken,
  setAuthCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    // Always spend ~250ms on bcrypt regardless of whether the user exists, so
    // attackers can't enumerate accounts by login-response timing.
    if (!user) {
      await dummyVerifyPassword(password);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const role = user.role === "admin" ? "admin" : "user";
    const now = Math.floor(Date.now() / 1000);
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role,
      name: user.name,
      tv: user.tokenVersion,
      oiat: now, // fresh login → absolute cap starts now
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
