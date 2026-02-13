import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

function isAuthConfigured(): boolean {
  return (
    typeof process.env.APP_PASSWORD === "string" &&
    process.env.APP_PASSWORD.length > 0 &&
    typeof process.env.AUTH_COOKIE_VALUE === "string" &&
    process.env.AUTH_COOKIE_VALUE.length > 0
  );
}

export function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  if (path === "/login") {
    return NextResponse.next();
  }
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (path.startsWith("/_next") || path.includes(".")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = process.env.AUTH_COOKIE_VALUE;
  if (cookieValue === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
