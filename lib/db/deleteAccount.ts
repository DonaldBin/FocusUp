import { createServerSupabaseClient } from "@/lib/db/server";
import { DELETE_ACCOUNT_CONFIRM } from "@/lib/domain/deleteAccount";

export { DELETE_ACCOUNT_CONFIRM, DELETE_ACCOUNT_WARNING } from "@/lib/domain/deleteAccount";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export type DeleteAccountDeps = {
  getUserId: () => Promise<string | null>;
  deleteOwnAuthUser: () => Promise<void>;
};

async function defaultDeleteAccountDeps(): Promise<DeleteAccountDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async deleteOwnAuthUser() {
      // Requires migration 002_delete_own_account.sql (security definer RPC).
      // Deleting auth.users cascades to profiles and all child rows (RLS-safe).
      const { error } = await supabase.rpc("delete_own_account");
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

/**
 * Permanently delete the signed-in account.
 * Caller must pass confirmation === DELETE_ACCOUNT_CONFIRM.
 */
export async function deleteAccount(
  confirmation: string,
  injected?: DeleteAccountDeps,
): Promise<DeleteAccountResult> {
  if (confirmation !== DELETE_ACCOUNT_CONFIRM) {
    return {
      ok: false,
      error: `Type ${DELETE_ACCOUNT_CONFIRM} to confirm`,
    };
  }

  const deps = injected ?? (await defaultDeleteAccountDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  try {
    await deps.deleteOwnAuthUser();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete account",
    };
  }
}
