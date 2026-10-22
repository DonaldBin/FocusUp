"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/db/client";
import {
  DELETE_ACCOUNT_CONFIRM,
  DELETE_ACCOUNT_WARNING,
} from "@/lib/domain/deleteAccount";
import { LOGIN_PATH } from "@/lib/auth/paths";

export function AccountSettings() {
  const router = useRouter();
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function exportCsv() {
    setExportError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setExportError(data?.error ?? "Could not export data");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "focusup-export.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not export data");
    } finally {
      setExporting(false);
    }
  }

  async function signOut() {
    setSignOutError(null);
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError(error.message);
        return;
      }
      window.location.assign(LOGIN_PATH);
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Could not sign out");
    } finally {
      setSigningOut(false);
    }
  }

  async function removeAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setDeleteError(data.error ?? "Could not delete account");
        return;
      }
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      window.location.assign(LOGIN_PATH);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete account",
      );
    } finally {
      setDeleting(false);
      router.refresh();
    }
  }

  return (
    <section className="w-full max-w-md space-y-4 border border-base-300 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-center">Account</h2>

      <div className="space-y-2">
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={exporting}
          onClick={() => void exportCsv()}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
        {exportError ? (
          <p className="text-error text-sm" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="btn btn-ghost w-full"
          disabled={signingOut}
          onClick={() => void signOut()}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError ? (
          <p className="text-error text-sm" role="alert">
            {signOutError}
          </p>
        ) : null}
      </div>

      <div className="divider my-1" />

      <div className="space-y-2">
        <h3 className="font-semibold text-error text-center">Danger zone</h3>
        <p className="text-xs opacity-70 text-center">{DELETE_ACCOUNT_WARNING}</p>
        <label className="form-control w-full">
          <span className="label-text mb-1">
            Type {DELETE_ACCOUNT_CONFIRM} to confirm
          </span>
          <input
            className="input input-bordered w-full"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            disabled={deleting}
          />
        </label>
        <button
          type="button"
          className="btn btn-error w-full"
          disabled={deleting || confirmation !== DELETE_ACCOUNT_CONFIRM}
          onClick={() => void removeAccount()}
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
        {deleteError ? (
          <p className="text-error text-sm" role="alert">
            {deleteError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
