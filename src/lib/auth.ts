/**
 * Minimal admin protection using HTTP Basic Auth: the browser shows its
 * built-in login prompt. Fine for a demo; see ARCHITECTURE.md for what to use
 * in production (e.g. Amazon Cognito or Auth.js).
 *
 * Credentials come from ADMIN_USER / ADMIN_PASSWORD. If ADMIN_PASSWORD is
 * empty, admin is left open (local development convenience only).
 */
export function isAuthorized(authorizationHeader: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return true;
  if (!authorizationHeader?.startsWith("Basic ")) return false;

  const decoded = atob(authorizationHeader.slice("Basic ".length));
  const separator = decoded.indexOf(":");
  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  return user === (process.env.ADMIN_USER || "admin") && pass === password;
}
