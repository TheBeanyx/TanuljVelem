import { describe, expect, it } from "vitest";
import { blocksToHtml, emptyVisualSite, readVisualSite, newSitePage, safeEmbedUrl, visualSiteToHtml, isValidSiteSlug, safeSiteUrl, sitePath } from "@/lib/teacherSites";

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
  it("preserves a legacy draft as the homepage", () => {
    const blocks = [{ id: "old", type: "text", content: "Existing lesson", url: "", align: "left", animation: "none" }];
    expect(readVisualSite(blocks).pages[0].blocks).toEqual(blocks);
  });
  it("restores theme and multiple pages from the saved draft", () => {
    const site = emptyVisualSite();
    site.theme.fontSize = 24;
    site.pages.push(newSitePage("Calendar", "calendar"));
    const restored = readVisualSite(JSON.parse(JSON.stringify(site)));
    expect(restored.theme.fontSize).toBe(24);
    expect(restored.pages[1].slug).toBe("calendar");
  });
  it("accepts Google Calendar iframe code but ignores other attributes", () => {
    expect(safeEmbedUrl('<iframe src="https://calendar.google.com/calendar/embed?src=school&amp;ctz=Europe%2FBudapest" onload="alert(1)"></iframe>')).toBe("https://calendar.google.com/calendar/embed?src=school&ctz=Europe%2FBudapest");
  });
  it("rejects arbitrary and lookalike embed origins", () => {
    expect(safeEmbedUrl("https://calendar.google.com.attacker.test/calendar/embed")).toBe("");
    expect(safeEmbedUrl("https://example.com/embed")).toBe("");
    expect(safeEmbedUrl("javascript:alert(1)")).toBe("");
  });
  it("compiles links between pages without external navigation", () => {
    const site = emptyVisualSite();
    const page = newSitePage("Calendar", "calendar");
    site.pages.push(page);
    site.pages[0].blocks.push({ id: "link", type: "button", content: "Calendar", url: "", pageId: page.id, align: "left", animation: "none" });
    expect(visualSiteToHtml("School", site)).toContain('class="cta" href="#calendar"');
  });
});