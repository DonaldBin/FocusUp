import { createBrowserClient } from "@supabase/ssr";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/**
 * Reads public Supabase env; throws if missing (safe to unit-test).
 * Client bundles require direct `process.env.NEXT_PUBLIC_*` access
 * so Next can inline values (dynamic `env[name]` is empty in the browser).
 */
export function getSupabasePublicEnv(
  env?: NodeJS.ProcessEnv,
): SupabasePublicEnv {
  const url = (
    env
      ? env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const anonKey = (
    env
      ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}

/** Browser Supabase client (call from Client Components). */
export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
