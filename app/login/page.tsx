import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import {
  POST_LOGIN_PATH,
  PRIVACY_PATH,
  TERMS_PATH,
} from "@/lib/auth/paths";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Props = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(POST_LOGIN_PATH);
  }

  const params = await searchParams;
  const authFailed = params.error === "auth";
  const detail = params.message?.trim();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">FocusUp</h1>
        <p className="opacity-70 max-w-sm">
          Focus areas + weekly decide. Sign in to continue.
        </p>
      </div>
      {authFailed ? (
        <p className="text-error text-sm text-center max-w-sm" role="alert">
          {detail
            ? `Sign-in failed: ${detail}`
            : "Sign-in failed. Please try Sign in with Google again."}
        </p>
      ) : null}
      <GoogleSignInButton />
      <p className="text-xs opacity-50 text-center max-w-xs">
        By continuing you agree to our{" "}
        <Link href={TERMS_PATH} className="link link-hover">
          Terms
        </Link>{" "}
        and{" "}
        <Link href={PRIVACY_PATH} className="link link-hover">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
