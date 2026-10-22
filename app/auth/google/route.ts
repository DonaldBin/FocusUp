import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/db/client";

const PROD_CALLBACK = "https://focusup.base-db.com/auth/callback";

function resolveRedirectTo(request: Request): string {
  // Prefer explicit public URL — request.url is often http://127.0.0.1:3003
  // behind Caddy/Cloudflare and must NOT be used for OAuth redirect_to.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) {
    return `${appUrl}/auth/callback`;
  }

  const forwarded =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  if (forwarded && !/localhost|127\.0\.0\.1/i.test(forwarded)) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwarded.split(",")[0]!.trim()}/auth/callback`;
  }

  return PROD_CALLBACK;
}

/** Start Google OAuth on the server so the PKCE verifier is stored in cookies. */
export async function GET(request: Request) {
  const redirectTo = resolveRedirectTo(request);

  const cookieStore = await cookies();
  const { url: supabaseUrl, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    const login = new URL("/login", "https://focusup.base-db.com");
    login.searchParams.set("error", "auth");
    login.searchParams.set(
      "message",
      error?.message ?? "Could not start Google sign-in",
    );
    return NextResponse.redirect(login);
  }

  const oauthUrl = new URL(data.url);
  oauthUrl.searchParams.set("redirect_to", redirectTo);
  return NextResponse.redirect(oauthUrl.toString());
}
