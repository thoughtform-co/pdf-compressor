import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isPasswordAuthConfigured } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, process.env.AUTH_COOKIE_VALUE!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
