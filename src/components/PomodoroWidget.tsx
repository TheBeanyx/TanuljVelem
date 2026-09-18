import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, Minimize2, Music, VolumeX } from "lucide-react";
import { TRACKS, TrackId, playTrack, stopMusic } from "@/lib/studyMusic";
import { notify } from "@/lib/notificationPrefs";

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
  const [track, setTrack] = useState<TrackId>("off");
  const [showMusic, setShowMusic] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            stopMusic();
            try {
              new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play();
            } catch {}
            notify(
              "pomodoro_done",
              mode === "focus" ? "Fókusz blokk letelt! 🍅" : "Vége a szünetnek! ⏰",
              mode === "focus" ? "Szép munka — tarts most egy rövid szünetet." : "Indíts egy új fókusz blokkot.",
              "/pomodoro"
            );
            if (mode === "focus") setCompleted((c) => c + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, mode]);

  // music follows the timer
  useEffect(() => {
    if (running && track !== "off") playTrack(track);
    else stopMusic();
  }, [running, track]);

  useEffect(() => () => stopMusic(), []);

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

  const tomato = (
    <div className={`relative mx-auto mb-3 ${embedded ? "w-[240px] h-[240px]" : "w-[190px] h-[190px]"}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        <defs>
          <radialGradient id="tomatoBody" cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#ff7a6b" />
            <stop offset="55%" stopColor="#ef3b34" />
            <stop offset="100%" stopColor="#b4181a" />
          </radialGradient>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5fbf5f" />
            <stop offset="100%" stopColor="#2f7d33" />
          </linearGradient>
        </defs>

        {/* body */}
        <path
          d="M100 42c40 0 66 26 66 60 0 38-30 66-66 66S34 140 34 102c0-34 26-60 66-60z"
          fill="url(#tomatoBody)"
        />
        {/* shine */}
        <ellipse cx="72" cy="80" rx="18" ry="11" fill="#fff" opacity="0.28" transform="rotate(-25 72 80)" />

        {/* progress ring around the tomato */}
        <circle cx="100" cy="106" r="76" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" opacity="0.5" />
        <circle
          cx="100" cy="106" r="76" fill="none"
          stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${pct * 477.5} 477.5`}
          transform="rotate(-90 100 106)"
          style={{ transition: "stroke-dasharray 0.9s linear" }}
        />

        {/* leaves */}
        <g fill="url(#leafGrad)">
          <path d="M100 44c-6-10-20-16-32-15 6 12 18 19 32 19z" />
          <path d="M100 44c6-10 20-16 32-15-6 12-18 19-32 19z" />
          <path d="M100 45c-3-12-12-22-24-26 2 14 10 24 24 28z" />
          <path d="M100 45c3-12 12-22 24-26-2 14-10 24-24 28z" />
        </g>
        <path d="M97 28c2-8 4-12 3-18 4 4 6 12 4 18z" fill="#2f7d33" />

        {/* time */}
        <text
          x="100" y="112"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="40"
          fontWeight="900"
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "1px" }}
        >
          {min}:{sec}
        </text>
        <text x="100" y="134" textAnchor="middle" fill="#ffffff" opacity="0.85" fontSize="13" fontWeight="700">
          {LABEL[mode]}
        </text>
      </svg>
    </div>
  );

  const body = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-lg">🍅</span> Pomodoro
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

      {tomato}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setRunning((r) => !r)}>
          {running ? <><Pause className="w-4 h-4 mr-1" />Szünet</> : <><Play className="w-4 h-4 mr-1" />Indítás</>}
        </Button>
        <Button variant="outline" size="icon" onClick={reset}><RotateCcw className="w-4 h-4" /></Button>
        <Button
          variant={track === "off" ? "outline" : "default"}
          size="icon"
          onClick={() => setShowMusic((s) => !s)}
          aria-label="Tanulást segítő zene"
        >
          {track === "off" ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
        </Button>
      </div>

      {showMusic && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">Tanulást segítő háttérzene (opcionális)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TRACKS.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={track === t.id ? "default" : "outline"}
                className="text-xs h-8 justify-start gap-1"
                onClick={() => setTrack(t.id)}
              >
                <span>{t.emoji}</span> {t.label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            A zene az időzítővel együtt indul és megáll.
          </p>
        </div>
      )}
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
