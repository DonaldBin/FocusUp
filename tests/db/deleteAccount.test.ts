import { describe, expect, it, vi } from "vitest";
import {
  DELETE_ACCOUNT_CONFIRM,
  deleteAccount,
  type DeleteAccountDeps,
} from "@/lib/db/deleteAccount";

function deps(overrides: Partial<DeleteAccountDeps> = {}): DeleteAccountDeps {
  return {
    getUserId: async () => "u1",
    deleteOwnAuthUser: async () => {},
    ...overrides,
  };
}

describe("deleteAccount", () => {
  it("requires typed confirmation", async () => {
    const deleteOwnAuthUser = vi.fn();
    const result = await deleteAccount("yes", deps({ deleteOwnAuthUser }));
    expect(result).toEqual({
      ok: false,
      error: `Type ${DELETE_ACCOUNT_CONFIRM} to confirm`,
    });
    expect(deleteOwnAuthUser).not.toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    const result = await deleteAccount(
      DELETE_ACCOUNT_CONFIRM,
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("deletes when confirmed", async () => {
    const deleteOwnAuthUser = vi.fn();
    const result = await deleteAccount(
      DELETE_ACCOUNT_CONFIRM,
      deps({ deleteOwnAuthUser }),
    );
    expect(result).toEqual({ ok: true });
    expect(deleteOwnAuthUser).toHaveBeenCalledOnce();
  });
});
