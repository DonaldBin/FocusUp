/** Auth route helpers (FocusUp Task 3.1 / 3.2). */

export const LOGIN_PATH = "/login";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const ONBOARDING_PATH = "/onboarding";
export const SETTINGS_PATH = "/settings";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const POST_LOGIN_PATH = "/";

/** Production canonical origin (OAuth redirectTo). Override with NEXT_PUBLIC_APP_URL. */
export const DEFAULT_APP_URL = "https://focusup.base-db.com";

export function isAuthPublicPath(pathname: string): boolean {
  return (
    pathname === LOGIN_PATH ||
    pathname === AUTH_CALLBACK_PATH ||
    pathname.startsWith(`${AUTH_CALLBACK_PATH}/`) ||
    pathname === PRIVACY_PATH ||
    pathname === TERMS_PATH
  );
}

/**
 * Origin used for OAuth redirectTo.
 * Prefer NEXT_PUBLIC_APP_URL in production so callbacks never fall back to a
 * stale localhost Site URL / wrong window origin.
 */
export function getAppOrigin(windowOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (windowOrigin && !/localhost|127\.0\.0\.1/i.test(windowOrigin)) {
    return windowOrigin.replace(/\/$/, "");
  }
  if (windowOrigin) {
    return windowOrigin.replace(/\/$/, "");
  }
  return DEFAULT_APP_URL;
}

export function getAuthCallbackUrl(windowOrigin?: string): string {
  return `${getAppOrigin(windowOrigin)}${AUTH_CALLBACK_PATH}`;
}
