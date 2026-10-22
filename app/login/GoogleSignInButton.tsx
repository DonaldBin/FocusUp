"use client";

/**
 * Navigate to the server OAuth starter so PKCE cookies are set correctly.
 * Do not start OAuth purely in the browser (that caused localhost / PKCE failures).
 */
export function GoogleSignInButton() {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <a href="/auth/google" className="btn btn-primary w-full">
        Sign in with Google
      </a>
    </div>
  );
}
