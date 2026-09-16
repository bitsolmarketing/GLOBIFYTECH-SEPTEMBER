/**
 * Auth.js chooses its session cookie name from the URL scheme, not from
 * NODE_ENV: over https it prefixes the cookie with `__Secure-`. Middleware and
 * bearer-token decoding both need the same name, because the cookie name is
 * also the encryption salt.
 *
 * Deployments that terminate TLS at a proxy see an http request with an
 * `x-forwarded-proto: https` header, so both signals are considered.
 */
export const SESSION_COOKIE = "authjs.session-token";
export const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

export function isSecureRequest(headers: Headers, protocol?: string): boolean {
  if (protocol === "https:") return true;
  const forwarded = headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]!.trim() === "https";
  return (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
}

export function sessionCookieName(secure: boolean): string {
  return secure ? SECURE_SESSION_COOKIE : SESSION_COOKIE;
}
