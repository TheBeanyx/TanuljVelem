export type SiteBlock = {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider";
  content: string;
  url: string;
  align: "left" | "center" | "right";
  animation: "none" | "fade" | "slide" | "pulse";
};
export const isValidSiteSlug = (slug: string) => slug.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
export const sitePath = (slug: string) => `/learn/${encodeURIComponent(slug)}`;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export function safeSiteUrl(url: string, image = false) {
  if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url)) return url;
  try { const parsed = new URL(url); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : ""; } catch { return ""; }
}
export function blocksToHtml(title: string, blocks: SiteBlock[]) {
  const content = blocks.map(block => {
    const text = escapeHtml(block.content);
    const url = escapeHtml(safeSiteUrl(block.url, block.type === "image"));
    const align = ["left", "center", "right"].includes(block.align) ? block.align : "left";
    const animation = ["fade", "slide", "pulse"].includes(block.animation) ? block.animation : "none";
    const inner = block.type === "heading" ? `<h2>${text}</h2>` : block.type === "text" ? `<p>${text}</p>` : block.type === "image" ? (url ? `<img src="${url}" alt="${text}" loading="lazy">` : "") : block.type === "button" ? (url ? `<a class="cta" href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : "") : "<hr>";
    return `<section class="block align-${align} motion-${animation}">${inner}</section>`;
  }).join("\n");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>
body{margin:0;background:hsl(var(--background));color:hsl(var(--foreground));font-family:Nunito,system-ui,sans-serif;line-height:1.7}main{max-width:900px;margin:auto;padding:48px 24px}.block{margin:24px 0;overflow-wrap:anywhere}.align-center{text-align:center}.align-right{text-align:right}h2{font-size:32px;line-height:1.3}p{white-space:pre-wrap}img{max-width:100%;height:auto;border-radius:8px}.cta{display:inline-block;padding:12px 24px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:8px;text-decoration:none;font-weight:700}hr{border:0;border-top:1px solid hsl(var(--border))}.motion-fade{animation:fade .7s both}.motion-slide{animation:slide .7s both}.motion-pulse{animation:pulse 2s ease-in-out infinite}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes slide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{50%{transform:scale(1.02)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body><main>${content}</main></body></html>`;
}
export function sandboxDocument(html: string, tokens: string) {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; img-src https: http: data:; font-src https: data:; media-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>:root{${tokens}}body{margin:0}</style>`;
  // Inject policy before any authored content, including malformed documents.
  return `<!doctype html><html><head>${policy}</head><body>${html}</body></html>`;
}