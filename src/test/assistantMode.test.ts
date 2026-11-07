import { describe, expect, it } from "vitest";
import { assistantMode } from "@/lib/assistantMode";

describe("signed-out support assistant", () => {
  it("offers platform support rather than learning help on the signed-out homepage", () => {
    expect(assistantMode("/", false)).toBe("support");
  });
  it("keeps the learning assistant after signing in", () => {
    expect(assistantMode("/dashboard", true)).toBe("learning");
  });
  it("keeps the assistant hidden in focused practice", () => {
    expect(assistantMode("/path", true)).toBe("hidden");
  });
  it("does not show signed-out support while the session is loading", () => {
    expect(assistantMode("/", false, true)).toBe("hidden");
  });
});