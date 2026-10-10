import { sandboxDocument } from "@/lib/teacherSites";

export default function TeacherSiteFrame({ html, title, className = "" }: { html: string; title: string; className?: string }) {
  const css = getComputedStyle(document.documentElement);
  const tokens = ["background", "foreground", "primary", "primary-foreground", "border", "muted", "muted-foreground", "card", "accent"].map(name => `--${name}:${css.getPropertyValue(`--${name}`)};`).join("");
  return <iframe title={title || "Tananyag előnézet"} srcDoc={sandboxDocument(html, tokens)} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className={`w-full border-0 bg-background ${className}`} />;
}