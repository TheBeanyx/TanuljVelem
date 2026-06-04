import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, X, Minimize2 } from "lucide-react";

type Mode = "focus" | "short" | "long";
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABEL: Record<Mode, string> = { focus: "Fókusz", short: "Rövid szünet", long: "Hosszú szünet" };

interface Props {
  defaultOpen?: boolean;
  embedded?: boolean;
}

const PomodoroWidget = ({ defaultOpen = false, embedded = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [mode, setMode] = useState<Mode>("focus");
  const [seconds, setSeconds] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            try {
              new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play();
            } catch {}
            if (mode === "focus") setCompleted((c) => c + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, mode]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSeconds(DURATIONS[m]);
    setRunning(false);
  };

  const reset = () => { setRunning(false); setSeconds(DURATIONS[mode]); };

  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  const pct = 1 - seconds / DURATIONS[mode];

  if (!open && !embedded) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
        aria-label="Pomodoro időzítő"
      >
        <Timer className="w-5 h-5" />
      </button>
    );
  }

  const body = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-bold">
          <Timer className="w-4 h-4 text-primary" /> Pomodoro
          {completed > 0 && <span className="text-xs text-muted-foreground">· {completed} kör</span>}
        </div>
        {!embedded && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
            <Minimize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="flex gap-1 mb-3">
        {(Object.keys(DURATIONS) as Mode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "default" : "outline"}
            className="flex-1 text-xs h-7 px-2"
            onClick={() => switchMode(m)}
          >{LABEL[m]}</Button>
        ))}
      </div>
      <div className="relative aspect-square max-w-[200px] mx-auto mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="6"
            strokeDasharray={`${pct * 283} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold tabular-nums">
          {min}:{sec}
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setRunning((r) => !r)}>
          {running ? <><Pause className="w-4 h-4 mr-1" />Szünet</> : <><Play className="w-4 h-4 mr-1" />Indítás</>}
        </Button>
        <Button variant="outline" size="icon" onClick={reset}><RotateCcw className="w-4 h-4" /></Button>
      </div>
    </>
  );

  if (embedded) {
    return <Card className="p-4 max-w-sm mx-auto">{body}</Card>;
  }

  return (
    <Card className="fixed bottom-24 right-4 z-40 w-[280px] p-4 shadow-2xl border-2">
      {body}
    </Card>
  );
};

export default PomodoroWidget;
