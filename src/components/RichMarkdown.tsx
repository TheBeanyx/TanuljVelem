import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Play, Code2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const INTERACTIVE_LANGS = ["html", "interactive", "animation", "svg"];

const InteractiveBlock = ({ code }: { code: string }) => {
  const [show, setShow] = useState(true);
  const [full, setFull] = useState(false);

  const doc = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{margin:0;padding:12px;font-family:Nunito,system-ui,sans-serif;background:#fff;color:#111}</style></head>
<body>${code}</body></html>`;

  const frame = (h: string) => (
    <iframe
      title="Interaktív tartalom"
      srcDoc={doc}
      sandbox="allow-scripts allow-popups"
      className={`w-full ${h} rounded-xl border border-border bg-white`}
    />
  );

  return (
    <div className="not-prose my-3 rounded-2xl border border-border overflow-hidden bg-muted/40">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/60">
        <span className="text-xs font-bold flex items-center gap-1">
          <Play className="w-3.5 h-3.5 text-primary" /> Interaktív
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setFull(true)}>
          <Maximize2 className="w-3.5 h-3.5" /> Nagyítás
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setShow((v) => !v)}>
          <Code2 className="w-3.5 h-3.5" /> {show ? "Kód" : "Futtatás"}
        </Button>
      </div>
      <div className="p-2">
        {show ? (
          frame("h-[320px]")
        ) : (
          <pre className="text-[11px] leading-relaxed overflow-x-auto p-2 max-h-[320px]">
            <code>{code}</code>
          </pre>
        )}
      </div>
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-3">
          {frame("h-[70vh]")}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RichMarkdown = ({ content, className = "" }: { content: string; className?: string }) => (
  <div
    className={`prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1.5 prose-headings:my-2 prose-pre:my-2 prose-table:my-3 ${className}`}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="not-prose my-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/70">{children}</thead>,
        th: ({ children }) => <th className="border border-border px-2.5 py-1.5 text-left font-bold">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2.5 py-1.5 align-top">{children}</td>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
            {children}
          </a>
        ),
        code: ({ className: cn, children, ...props }: any) => {
          const lang = /language-(\w+)/.exec(cn || "")?.[1]?.toLowerCase();
          const raw = String(children).replace(/\n$/, "");
          if (lang && INTERACTIVE_LANGS.includes(lang)) return <InteractiveBlock code={raw} />;
          if (lang) {
            return (
              <pre className="not-prose my-2 rounded-xl bg-muted p-3 overflow-x-auto text-[12px]">
                <code>{raw}</code>
              </pre>
            );
          }
          return (
            <code className="px-1 py-0.5 rounded bg-muted text-[0.85em]" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default RichMarkdown;
