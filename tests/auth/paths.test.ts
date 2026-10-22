import { describe, expect, it } from "vitest";
import {
  AUTH_CALLBACK_PATH,
  DEFAULT_APP_URL,
  LOGIN_PATH,
  PRIVACY_PATH,
  TERMS_PATH,
  getAppOrigin,
  getAuthCallbackUrl,
  isAuthPublicPath,
} from "@/lib/auth/paths";

describe("isAuthPublicPath", () => {
  it("allows login and callback", () => {
    expect(isAuthPublicPath(LOGIN_PATH)).toBe(true);
    expect(isAuthPublicPath(AUTH_CALLBACK_PATH)).toBe(true);
  });

  it("allows privacy and terms", () => {
    expect(isAuthPublicPath(PRIVACY_PATH)).toBe(true);
    expect(isAuthPublicPath(TERMS_PATH)).toBe(true);
  });

  it("does not treat home as an auth public path", () => {
    expect(isAuthPublicPath("/")).toBe(false);
  });
});

describe("getAuthCallbackUrl", () => {
  it("uses production origin for public hosts", () => {
    expect(getAppOrigin("https://focusup.base-db.com")).toBe(
      "https://focusup.base-db.com",
    );
    expect(getAuthCallbackUrl("https://focusup.base-db.com")).toBe(
      "https://focusup.base-db.com/auth/callback",
    );
  });

  it("keeps localhost for local development when env unset", () => {
    expect(getAppOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("defaults to production URL when origin missing", () => {
    expect(getAppOrigin()).toBe(DEFAULT_APP_URL);
  });
});
