import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/db/client";
import {
  AUTH_CALLBACK_PATH,
  LOGIN_PATH,
  POST_LOGIN_PATH,
  isAuthPublicPath,
} from "@/lib/auth/paths";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Do not touch OAuth start/callback — PKCE cookies must stay intact.
  if (
    pathname === AUTH_CALLBACK_PATH ||
    pathname.startsWith(`${AUTH_CALLBACK_PATH}/`) ||
    pathname === "/auth/google" ||
    pathname.startsWith("/auth/google/")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && pathname === LOGIN_PATH) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = POST_LOGIN_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  // silence unused for now (home stays reachable when logged out)
  void isAuthPublicPath;

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
