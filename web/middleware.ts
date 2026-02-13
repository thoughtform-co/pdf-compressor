import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "pdf_compressor_auth";

function isPasswordAuthConfigured(): boolean {
  return (
    typeof process.env.APP_PASSWORD === "string" &&
    process.env.APP_PASSWORD.length > 0 &&
    typeof process.env.AUTH_COOKIE_VALUE === "string" &&
    process.env.AUTH_COOKIE_VALUE.length > 0
  );
}

function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return process.env.AUTH_COOKIE_VALUE === cookieValue;
}

export async function middleware(request: NextRequest) {
  if (!isPasswordAuthConfigured()) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const url = request.nextUrl;
  const isLogin = url.pathname === "/login";
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (isAuthenticated(cookieValue)) {
    if (isLogin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  if (!isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
