/**
 * Simple password gate: no user accounts, no stored data.
 * One shared password in env; successful login sets an httpOnly cookie.
 */

export const AUTH_COOKIE_NAME = "pdf_compressor_auth";

export function isPasswordAuthConfigured(): boolean {
  return (
    typeof process.env.APP_PASSWORD === "string" &&
    process.env.APP_PASSWORD.length > 0 &&
    typeof process.env.AUTH_COOKIE_VALUE === "string" &&
    process.env.AUTH_COOKIE_VALUE.length > 0
  );
}

export function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return process.env.AUTH_COOKIE_VALUE === cookieValue;
}
