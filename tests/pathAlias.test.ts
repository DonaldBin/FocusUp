import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/lib/appMeta";

describe("path alias @/", () => {
  it("imports from @/lib/*", () => {
    expect(APP_NAME).toBe("FocusUp");
  });
});
