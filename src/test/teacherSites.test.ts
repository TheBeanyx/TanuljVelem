import { describe, expect, it } from "vitest";
import { blocksToHtml, isValidSiteSlug, safeSiteUrl, sitePath } from "@/lib/teacherSites";

describe("teacher publishing rules", () => {
  it("publishes at the requested learn address", () => {
    expect(sitePath("biologia-7")).toBe("/learn/biologia-7");
  });
  it("rejects slugs that would escape the teacher page address", () => {
    expect(isValidSiteSlug("../reset-password")).toBe(false);
    expect(isValidSiteSlug("biologia-7")).toBe(true);
  });
  it("rejects script URLs for authored buttons", () => {
    expect(safeSiteUrl("javascript:alert(1)")).toBe("");
  });
  it("does not execute text as HTML", () => {
    const html = blocksToHtml("Biológia", [{ id: "1", type: "text", content: "<script>alert(1)</script>", url: "", align: "left", animation: "none" }]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});