import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await findUserByEmail(String(email));
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const role = user.role === "admin" ? "admin" : "user";
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role,
      name: user.name,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
