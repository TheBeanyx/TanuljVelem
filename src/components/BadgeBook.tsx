import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BadgeDef, BadgeId } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export interface BadgeProgress {
  current: number;
  target: number;
  label: string;
  task: string;
}

interface BadgeBookProps {
  badges: BadgeDef[];
  owned: Set<BadgeId>;
  progressOf: (id: BadgeId) => BadgeProgress;
  onOpen3D: (id: BadgeId) => void;
}

const PER_PAGE = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function BadgeBook({ badges, owned, progressOf, onOpen3D }: BadgeBookProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  const pages = useMemo(() => chunk(badges, PER_PAGE), [badges]);
  const spreadCount = Math.ceil(pages.length / 2);
  const left = pages[spread * 2];
  const right = pages[spread * 2 + 1];

  const go = (d: 1 | -1) => {
    const next = spread + d;
    if (next < 0 || next >= spreadCount) return;
    setDir(d);
    setSpread(next);
  };

  return (
    <div className="[perspective:2000px]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* ---------- COVER ---------- */
          <motion.button
            key="cover"
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, rotateY: -25, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: -95 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            whileHover={{ rotateY: -8, scale: 1.02 }}
            style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
            className="relative mx-auto block w-full max-w-sm aspect-[3/4] rounded-r-2xl rounded-l-md overflow-hidden shadow-2xl border border-border/50 gradient-hero"
          >
            {/* spine */}
            <span className="absolute left-0 top-0 bottom-0 w-5 bg-black/25" />
            <span className="absolute left-5 top-0 bottom-0 w-px bg-white/30" />

            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />

            <span className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-primary-foreground">
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl"
              >
                📖
              </motion.span>
              <span className="text-3xl font-extrabold leading-tight drop-shadow">
                Küldetések<br />Könyve
              </span>
              <span className="h-px w-24 bg-primary-foreground/50" />
              <span className="text-sm font-semibold opacity-90">
                {owned.size} / {badges.length} megszerezve
              </span>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-1.5 text-xs font-bold backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" /> Nyisd ki a könyvet
              </span>
            </span>
          </motion.button>
        ) : (
          /* ---------- OPEN BOOK ---------- */
          <motion.div
            key="book"
            initial={{ opacity: 0, rotateY: 25 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 25 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/60 to-muted/20 p-3 sm:p-5 shadow-2xl">
              {/* close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 top-3 z-20 rounded-full bg-background/80 p-1.5 text-muted-foreground shadow hover:text-foreground"
                aria-label="Könyv becsukása"
              >
                <X className="h-4 w-4" />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={spread}
                  initial={{ rotateY: dir === 1 ? 75 : -75, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: dir === 1 ? -75 : 75, opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
                  className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0"
                >
                  <BookPage
                    items={left ?? []}
                    side="left"
                    pageNumber={spread * 2 + 1}
                    owned={owned}
                    progressOf={progressOf}
                    onOpen3D={onOpen3D}
                  />
                  <BookPage
                    items={right ?? []}
                    side="right"
                    pageNumber={spread * 2 + 2}
                    owned={owned}
                    progressOf={progressOf}
                    onOpen3D={onOpen3D}
                  />
                </motion.div>
              </AnimatePresence>

              {/* center spine on desktop */}
              <div className="pointer-events-none absolute left-1/2 top-5 bottom-16 hidden w-6 -translate-x-1/2 md:block">
                <div className="h-full w-full bg-gradient-to-r from-black/10 via-black/25 to-black/10 dark:from-white/5 dark:via-white/15 dark:to-white/5" />
              </div>

              {/* pager */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={spread === 0} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Vissza
                </Button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: spreadCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${i + 1}. oldalpár`}
                      onClick={() => { setDir(i > spread ? 1 : -1); setSpread(i); }}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === spread ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      )}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => go(1)} disabled={spread >= spreadCount - 1} className="gap-1">
                  Lapozz <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookPage({
  items,
  side,
  pageNumber,
  owned,
  progressOf,
  onOpen3D,
}: {
  items: BadgeDef[];
  side: "left" | "right";
  pageNumber: number;
  owned: Set<BadgeId>;
  progressOf: (id: BadgeId) => BadgeProgress;
  onOpen3D: (id: BadgeId) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="hidden min-h-[420px] flex-col items-center justify-center rounded-xl bg-[hsl(var(--card))] p-6 text-center text-sm text-muted-foreground md:flex">
        <Sparkles className="mb-2 h-6 w-6 opacity-40" />
        Ide még újabb küldetések kerülnek…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[420px] flex-col rounded-xl bg-[hsl(var(--card))] p-4 shadow-inner",
        side === "left" ? "md:rounded-r-none md:pr-7" : "md:rounded-l-none md:pl-7"
      )}
    >
      <div className="mb-3 flex items-center justify-between border-b border-dashed border-border pb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Küldetések
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground">{pageNumber}. oldal</span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map((b, i) => {
          const earned = owned.has(b.id);
          const p = progressOf(b.id);
          const pct = Math.min(100, Math.round((p.current / p.target) * 100));
          return (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => onOpen3D(b.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, rotateX: -6 }}
              style={{ transformStyle: "preserve-3d" }}
              className={cn(
                "flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition-colors",
                earned
                  ? `bg-gradient-to-br ${b.color} border-white/30 text-white shadow-md`
                  : "border-border bg-muted/30 hover:border-primary/40"
              )}
            >
              <span className={cn("text-3xl", earned ? "" : "opacity-50 grayscale")}>{b.emoji}</span>
              <span className="mt-1 text-[11px] font-bold leading-tight">{b.name}</span>
              {!earned && (
                <span className="mt-1.5 w-full">
                  <Progress value={pct} className="h-1" />
                  <span className="mt-0.5 block text-[9px] font-medium text-muted-foreground">
                    {p.current}/{p.target}
                  </span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
