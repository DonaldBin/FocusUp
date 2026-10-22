import Link from "next/link";
import { APP_NAME } from "@/lib/appMeta";
import { LOGIN_PATH, PRIVACY_PATH } from "@/lib/auth/paths";

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <article className="w-full max-w-md space-y-4 pt-4 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold text-center">Terms of Service</h1>
        <p className="text-xs opacity-60 text-center">
          Placeholder for {APP_NAME}. Review with counsel before a public launch.
        </p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">The service</h2>
          <p>
            {APP_NAME} is a personal focus and weekly-review tool. It is provided
            as-is for productivity tracking. Features may change as the product
            evolves.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Accounts</h2>
          <p>
            You must sign in with Google to use {APP_NAME}. You are responsible
            for activity under your account. Do not use the service for unlawful
            purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Your content</h2>
          <p>
            You keep ownership of the focus text, time notes, and outcomes you
            enter. You grant us permission to store and process that content only
            to operate {APP_NAME} for you (including sync, export, and account
            deletion you request).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Privacy</h2>
          <p>
            How we handle personal data is described in our{" "}
            <Link href={PRIVACY_PATH} className="link">
              Privacy Policy
            </Link>
            . Your app data is meant to stay private to your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Availability and liability</h2>
          <p>
            We aim for reliable access but do not guarantee uninterrupted
            service. To the extent allowed by law, {APP_NAME} is provided without
            warranties, and we are not liable for lost productivity or data loss
            beyond restoring or deleting your account data as the product
            allows.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Changes</h2>
          <p>
            We may update these terms. Continued use after changes means you
            accept the updated terms. This placeholder is not legal advice.
          </p>
        </section>

        <p className="text-center space-x-3 pt-2">
          <Link href={PRIVACY_PATH} className="link link-hover">
            Privacy Policy
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
