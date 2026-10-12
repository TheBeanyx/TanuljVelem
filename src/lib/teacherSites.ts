export const SITE_FONTS = {
  nunito: { label: "Nunito", css: "Nunito,system-ui,sans-serif" },
  arial: { label: "Arial", css: "Arial,Helvetica,sans-serif" },
  georgia: { label: "Georgia", css: "Georgia,serif" },
  mono: { label: "Monospace", css: "ui-monospace,monospace" },
  roboto: { label: "Roboto", css: "Roboto,Arial,sans-serif" },
  montserrat: { label: "Montserrat", css: "Montserrat,Arial,sans-serif" },
} as const;
export type SiteTheme = {
  font: keyof typeof SITE_FONTS;
  background: string;
  foreground: string;
  primary: string;
  backgroundImage: string;
  backgroundFit: "cover" | "contain" | "repeat";
  contentWidth: number;
  fontSize: number;
  spacing: number;
};
export type SiteBlock = {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider" | "embed";
  content: string;
  url: string;
  align: "left" | "center" | "right";
  animation: "none" | "fade" | "slide" | "pulse";
  font?: keyof typeof SITE_FONTS;
  color?: string;
  background?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  padding?: number;
  radius?: number;
  pageId?: string;
};
export type SitePage = { id: string; title: string; slug: string; blocks: SiteBlock[] };
export type VisualSite = { version: 2; theme: SiteTheme; pages: SitePage[]; homePageId: string };
export const defaultTheme = (): SiteTheme => ({ font: "nunito", background: "", foreground: "", primary: "", backgroundImage: "", backgroundFit: "cover", contentWidth: 1000, fontSize: 18, spacing: 24 });
export const newSitePage = (title = "Főoldal", slug = "") : SitePage => ({ id: crypto.randomUUID(), title, slug, blocks: [] });
export const emptyVisualSite = (): VisualSite => {
  const home = newSitePage();
  return { version: 2, theme: defaultTheme(), pages: [home], homePageId: home.id };
};
export function readVisualSite(value: unknown): VisualSite {
  if (Array.isArray(value)) {
    const site = emptyVisualSite(); site.pages[0].blocks = value as SiteBlock[]; return site;
  }
  if (value && typeof value === "object" && "version" in value && value.version === 2 && "pages" in value && Array.isArray(value.pages) && value.pages.length) {
    const parsed = value as VisualSite;
    return { version: 2, pages: parsed.pages, theme: { ...defaultTheme(), ...parsed.theme }, homePageId: parsed.pages.some(p => p.id === parsed.homePageId) ? parsed.homePageId : parsed.pages[0].id };
  }
  return emptyVisualSite();
}
export const isValidSiteSlug = (slug: string) => slug.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
export const sitePath = (slug: string) => `/learn/${encodeURIComponent(slug)}`;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
export function safeSiteUrl(url: string, image = false) {
  if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url)) return url;
  try { const parsed = new URL(url); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : ""; } catch { return ""; }
}
export function safeEmbedUrl(value: string) {
  const src = value.trim().startsWith("<") ? /\bsrc\s*=\s*["']([^"']+)["']/i.exec(value)?.[1]?.replace(/&amp;/g, "&") : value.trim();
  if (!src) return "";
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    const allowed = url.hostname === "calendar.google.com" && url.pathname === "/calendar/embed"
      || ["www.youtube-nocookie.com", "www.youtube.com"].includes(url.hostname) && /^\/embed\/[\w-]+$/.test(url.pathname)
      || url.hostname === "docs.google.com" && /^\/forms\/d\/(e\/)?[\w-]+\/viewform$/.test(url.pathname);
    return allowed ? url.href : "";
  } catch { return ""; }
}
const color = (v: string | undefined, fallback: string) => v && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
const size = (v: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(v) ? Math.min(max, Math.max(min, Number(v))) : fallback;
const font = (v: string | undefined) => SITE_FONTS[v as keyof typeof SITE_FONTS]?.css ?? SITE_FONTS.nunito.css;
function renderBlocks(blocks: SiteBlock[], pages: SitePage[], theme: SiteTheme) {
  return blocks.map(block => {
    const text = escapeHtml(block.content);
    const url = escapeHtml(safeSiteUrl(block.url, block.type === "image"));
    const align = ["left", "center", "right"].includes(block.align) ? block.align : "left";
    const animation = ["fade", "slide", "pulse"].includes(block.animation) ? block.animation : "none";
    const targetPage = pages.find(p => p.id === block.pageId);
    const href = targetPage ? `#${escapeHtml(targetPage.slug || "home")}` : url;
    const embed = safeEmbedUrl(block.url);
    const inner = block.type === "heading" ? `<h2>${text}</h2>` : block.type === "text" ? `<p>${text}</p>` : block.type === "image" ? (url ? `<img src="${url}" alt="${text}" loading="lazy">` : "") : block.type === "button" ? (href ? `<a class="cta" href="${href}" ${targetPage ? "" : 'target="_blank" rel="noopener noreferrer"'}>${text}</a>` : "") : block.type === "embed" ? (embed ? `<iframe title="${text || "Beágyazott tartalom"}" src="${escapeHtml(embed)}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer" allowfullscreen></iframe>` : "") : "<hr>";
    const styles = `--element-font:${font(block.font ?? theme.font)};--element-size:${size(block.fontSize, block.type === "heading" ? 32 : theme.fontSize, 10, 96)}px;--element-color:${color(block.color, "inherit")};--element-bg:${color(block.background, "transparent")};--element-radius:${size(block.radius, 8, 0, 80)}px;--element-height:${size(block.height, 500, 100, 1200)}px;width:${size(block.width, 100, 10, 100)}%;padding:${size(block.padding, 0, 0, 120)}px`;
    return `<section class="block align-${align} motion-${animation}" style="${styles}">${inner}</section>`;
  }).join("\n");
}
export function blocksToHtml(title: string, blocks: SiteBlock[]) {
  const site = emptyVisualSite(); site.pages[0].blocks = blocks;
  return visualSiteToHtml(title, site);
}
export function visualSiteToHtml(title: string, site: VisualSite) {
  const theme = { ...defaultTheme(), ...site.theme };
  const background = safeSiteUrl(theme.backgroundImage, true);
  const home = site.pages.find(p => p.id === site.homePageId) ?? site.pages[0];
  const nav = site.pages.length > 1 ? `<nav aria-label="Oldalak">${site.pages.map(p => `<a href="#${escapeHtml(p.slug || "home")}">${escapeHtml(p.title)}</a>`).join("")}</nav>` : "";
  const pages = site.pages.map(p => `<article data-site-page="${escapeHtml(p.slug || "home")}" ${p.id === home.id ? "" : "hidden"}>${renderBlocks(p.blocks, site.pages, theme)}</article>`).join("\n");
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&display=swap"><style>
body{margin:0;--site-primary:${color(theme.primary,"hsl(var(--primary))")};background-color:${color(theme.background,"hsl(var(--background))")};color:${color(theme.foreground,"hsl(var(--foreground))")};font-family:${font(theme.font)};font-size:${size(theme.fontSize,18,10,40)}px;line-height:1.7;${background ? `background-image:url("${escapeHtml(background)}");background-size:${theme.backgroundFit === "contain" ? "contain" : theme.backgroundFit === "repeat" ? "auto" : "cover"};background-repeat:${theme.backgroundFit === "repeat" ? "repeat" : "no-repeat"};background-attachment:fixed;` : ""}}
*{box-sizing:border-box;letter-spacing:0}main{max-width:${size(theme.contentWidth,1000,320,1600)}px;margin:auto;padding:32px 24px}nav{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid hsl(var(--border));padding-bottom:16px}nav a{color:inherit;padding:8px 12px;text-decoration:none;border-radius:6px}nav a[aria-current=page]{background:var(--site-primary);color:hsl(var(--primary-foreground))}[hidden]{display:none!important}.block{margin:${size(theme.spacing,24,0,100)}px 0;overflow-wrap:anywhere;max-width:100%;font-family:var(--element-font);color:var(--element-color);background:var(--element-bg);border-radius:var(--element-radius)}.align-center{text-align:center;margin-left:auto;margin-right:auto}.align-right{text-align:right;margin-left:auto}h2{font-size:var(--element-size);line-height:1.3;margin:0}p{white-space:pre-wrap;font-size:var(--element-size);margin:0}img{display:block;max-width:100%;width:100%;height:auto;border-radius:var(--element-radius)}iframe{display:block;width:100%;height:var(--element-height);border:0;border-radius:var(--element-radius)}.cta{display:inline-block;padding:12px 24px;background:var(--site-primary);color:hsl(var(--primary-foreground));font-size:var(--element-size);border-radius:var(--element-radius);text-decoration:none;font-weight:700}hr{border:0;border-top:1px solid hsl(var(--border))}.motion-fade{animation:fade .7s both}.motion-slide{animation:slide .7s both}.motion-pulse{animation:pulse 2s ease-in-out infinite}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes slide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{50%{transform:scale(1.02)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}@media(max-width:600px){main{padding:24px 16px}.block{min-width:0}}
</style></head><body><main>${nav}${pages}</main><script>(()=>{const show=(key='')=>{const pages=[...document.querySelectorAll('[data-site-page]')];const page=pages.find(p=>p.dataset.sitePage===key)||pages.find(p=>p.dataset.sitePage===${JSON.stringify(home.slug || "home").replace(/</g,"\\u003c")})||pages[0];pages.forEach(p=>p.hidden=p!==page);document.querySelectorAll('nav a').forEach(a=>{if(a.hash.slice(1)===page.dataset.sitePage)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})};document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a){e.preventDefault();show(a.getAttribute('href').slice(1));scrollTo(0,0)}});show()})()</script></body></html>`;
}
export function sandboxDocument(html: string, tokens: string) {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; img-src https: http: data:; font-src https: data:; media-src https: data:; connect-src 'none'; frame-src https://calendar.google.com https://www.youtube-nocookie.com https://www.youtube.com https://docs.google.com; form-action 'none'; base-uri 'none'"><style>:root{${tokens}}body{margin:0}</style>`;
  return `<!doctype html><html><head>${policy}</head><body>${html}</body></html>`;
}
