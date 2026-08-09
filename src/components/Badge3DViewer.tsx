import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Pause, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeDef } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface Badge3DViewerProps {
  badge: BadgeDef;
  earned: boolean;
}

/**
 * 3D "medál" nézet: pörgő, fogantható (drag) érme elülső és hátsó lappal.
 */
export default function Badge3DViewer({ badge, earned }: Badge3DViewerProps) {
  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(-8);
  const [spinning, setSpinning] = useState(true);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (spinning && !dragging.current) rotateY.set(rotateY.get() + 0.55);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning, rotateY]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    rotateY.set(rotateY.get() + dx * 0.6);
    rotateX.set(Math.max(-45, Math.min(45, rotateX.get() - dy * 0.4)));
  };
  const onPointerUp = () => { dragging.current = false; };

  const reset = () => { rotateY.set(0); rotateX.set(-8); };

  const faceBase =
    "absolute inset-0 flex flex-col items-center justify-center rounded-full [backface-visibility:hidden] border-[6px] border-white/40 shadow-2xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative h-44 w-44 cursor-grab touch-none select-none active:cursor-grabbing [perspective:900px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <motion.div
          style={{ rotateY, rotateX, transformStyle: "preserve-3d" }}
          className="relative h-full w-full"
        >
          {/* front */}
          <div
            className={cn(
              faceBase,
              `bg-gradient-to-br ${badge.color}`,
              !earned && "grayscale"
            )}
          >
            <span className="text-6xl drop-shadow-lg">{badge.emoji}</span>
            <span className="mt-1 px-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-white/95">
              {badge.name}
            </span>
          </div>

          {/* back */}
          <div
            className={cn(
              faceBase,
              `bg-gradient-to-tl ${badge.color}`,
              !earned && "grayscale"
            )}
            style={{ transform: "rotateY(180deg)" }}
          >
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">TanuljVelem</span>
            <span className="mt-1 text-3xl">{earned ? "✓" : "🔒"}</span>
            <span className="mt-1 px-4 text-center text-[10px] font-semibold leading-snug text-white/90">
              {earned ? "Megszerezve" : "Még nincs meg"}
            </span>
          </div>
        </motion.div>

        {/* glow / talp */}
        <div className="pointer-events-none absolute -bottom-3 left-1/2 h-3 w-28 -translate-x-1/2 rounded-full bg-black/25 blur-md dark:bg-black/60" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSpinning((s) => !s)}>
          {spinning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {spinning ? "Állj" : "Pörgesd"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={reset}>
          <RotateCw className="h-3 w-3" /> Alaphelyzet
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Húzd az érmét az ujjaddal / egérrel a forgatáshoz</p>
    </div>
  );
}
