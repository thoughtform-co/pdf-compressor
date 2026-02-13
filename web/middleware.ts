import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isPasswordAuthConfigured, isAuthenticated } from "./src/lib/auth";

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
