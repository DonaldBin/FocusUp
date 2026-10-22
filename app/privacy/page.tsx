import Link from "next/link";
import { APP_NAME } from "@/lib/appMeta";
import { LOGIN_PATH, TERMS_PATH } from "@/lib/auth/paths";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <article className="w-full max-w-md space-y-4 pt-4 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold text-center">Privacy Policy</h1>
        <p className="text-xs opacity-60 text-center">
          Placeholder for {APP_NAME}. Review with counsel before a public launch.
        </p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Who we are</h2>
          <p>
            {APP_NAME} helps you track focus areas, time, outcomes, and a weekly
            review decision. This page describes how we handle your data in plain
            language.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Sign-in</h2>
          <p>
            You sign in with <strong>Google</strong>. We receive basic account
            identifiers from Google (such as your Google user id and email) so we
            can create and recognize your {APP_NAME} account. We do not receive or
            store your Google password.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">What we store</h2>
          <p>
            For your account we store focus names and reasons, timers and manual
            time entries, outcomes, weekly review decisions, plan and schedule
            settings (including timezone), and related timestamps. This data is
            tied to your signed-in user and is intended to be <strong>private to
            you</strong> — other users cannot read it through the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Where it lives</h2>
          <p>
            Data is stored in our hosted database (Supabase / Postgres) with row
            level security so each user only accesses their own rows. Offline
            drafts may also sit temporarily in your browser storage until they
            sync.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Export and delete</h2>
          <p>
            You can export your data as CSV and delete your account from
            Settings. Deleting your account removes your {APP_NAME} data
            associated with that login (this cannot be undone).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Contact</h2>
          <p>
            For privacy questions about this product, contact the operator of
            this {APP_NAME} deployment. This placeholder is not legal advice.
          </p>
        </section>

        <p className="text-center space-x-3 pt-2">
          <Link href={TERMS_PATH} className="link link-hover">
            Terms of Service
          </Link>
          <Link href={LOGIN_PATH} className="link link-hover">
            Sign in
          </Link>
          <Link href="/" className="link link-hover">
            Home
          </Link>
        </p>
      </article>
    </main>
  );
}
