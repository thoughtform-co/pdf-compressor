import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "pdf_compressor_auth";

export function middleware(request: NextRequest) {
  const hasPassword =
    typeof process.env.APP_PASSWORD === "string" &&
    process.env.APP_PASSWORD.length > 0 &&
    typeof process.env.AUTH_COOKIE_VALUE === "string" &&
    process.env.AUTH_COOKIE_VALUE.length > 0;

  if (!hasPassword) {
    return NextResponse.next();
  }

  const isLogin = request.nextUrl.pathname === "/login";
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = cookieValue === process.env.AUTH_COOKIE_VALUE;

  if (authenticated && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (!isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
