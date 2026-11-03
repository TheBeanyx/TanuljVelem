import { describe, expect, it } from "vitest";
import { buildParentInviteMailto, isCodeActive, isValidParentCodeFormat, normalizeParentCode } from "@/lib/parents";

describe("parent link codes", () => {
  it("normalises typed codes", () => {
    expect(normalizeParentCode(" ab12-cd34 ")).toBe("AB12CD34");
    expect(isValidParentCodeFormat("ab12cd34")).toBe(true);
    expect(isValidParentCodeFormat("ABC")).toBe(false);
  });

  it("a used or expired code is not active", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(isCodeActive({ used_at: null, expires_at: "2026-11-10T12:00:00Z" }, now)).toBe(true);
    expect(isCodeActive({ used_at: "2026-11-03T10:00:00Z", expires_at: "2026-11-10T12:00:00Z" }, now)).toBe(false);
    expect(isCodeActive({ used_at: null, expires_at: "2026-11-02T12:00:00Z" }, now)).toBe(false);
  });

  it("puts the code and recipient into the email", () => {
    const url = buildParentInviteMailto({ code: "AB12CD34", studentName: "Peti", email: "anya@pelda.hu", origin: "https://x.hu" });
    expect(url.startsWith("mailto:anya%40pelda.hu?")).toBe(true);
    expect(decodeURIComponent(url)).toContain("AB12CD34");
  });
});
