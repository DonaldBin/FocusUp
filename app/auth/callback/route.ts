import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/db/client";
import { LOGIN_PATH, POST_LOGIN_PATH } from "@/lib/auth/paths";

/**
 * Server-side OAuth code exchange (PKCE via cookies).
 * Prefer this over the client page so the verifier cookie is available.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = POST_LOGIN_PATH;

  if (!code) {
    const url = new URL(LOGIN_PATH, origin);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", "missing code");
    return NextResponse.redirect(url);
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL(LOGIN_PATH, origin);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  // Prefer configured public origin — request.url is often localhost behind Caddy.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    (() => {
      const host =
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host");
      if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        return `${proto}://${host.split(",")[0]!.trim()}`;
      }
      return "https://focusup.base-db.com";
    })() ||
    origin;
  return NextResponse.redirect(new URL(nextPath, appUrl));
}
