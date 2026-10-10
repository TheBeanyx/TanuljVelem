import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { DURATIONS, remainingSeconds, PomodoroMode } from "@/lib/pomodoro";
import { TrackId, playTrack, stopMusic } from "@/lib/studyMusic";
import { notify } from "@/lib/notificationPrefs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function useTimerState() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [seconds, setSeconds] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [track, setTrack] = useState<TrackId>("off");
  const [active, setActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const deadline = useRef<number | null>(null);

  const toggle = () => {
    setActive(true);
    if (running) {
      if (deadline.current !== null) setSeconds(remainingSeconds(deadline.current, Date.now()));
      deadline.current = null;
      setRunning(false);
    } else {
      const duration = seconds || DURATIONS[mode];
      setSeconds(duration);
      deadline.current = Date.now() + duration * 1000;
      setRunning(true);
    }
  };
  const reset = (nextMode: PomodoroMode = mode) => {
    deadline.current = null;
    setRunning(false);
    setMode(nextMode);
    setSeconds(DURATIONS[nextMode]);
  };
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (deadline.current === null) return;
      const left = remainingSeconds(deadline.current, Date.now());
      setSeconds(left);
      if (left === 0) {
        deadline.current = null;
        setRunning(false);
        if (mode === "focus") setCompleted(c => c + 1);
        notify("pomodoro_done", mode === "focus" ? "Fókusz blokk letelt! 🍅" : "Vége a szünetnek!", "Indítsd a következő szakaszt, amikor készen állsz.", "/pomodoro");
      }
    };
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [running, mode]);
  useEffect(() => {
    if (running && track !== "off") playTrack(track); else stopMusic();
    return () => stopMusic();
  }, [running, track]);
  useEffect(() => {
    reset("focus"); setActive(false); setCompleted(0); setTrack("off");
    pipWindow?.close();
    // Reset personal timer when accounts change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openPictureInPicture = async () => {
    const api = (window as Window & { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!api) { toast.info("Ez a böngésző nem támogatja a külső kép-a-képben ablakot. A TanuljVelem oldalain az időzítő továbbra is lebeghet."); return; }
    try {
      if (pipWindow && !pipWindow.closed) { pipWindow.focus(); return; }
      const target = await api.requestWindow({ width: 340, height: 510 });
      target.document.title = "TanuljVelem • Pomodoro";
      target.document.documentElement.className = document.documentElement.className;
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => target.document.head.appendChild(node.cloneNode(true)));
      target.addEventListener("pagehide", () => setPipWindow(null), { once: true });
      setActive(true); setPipWindow(target);
    } catch { toast.error("A lebegő ablak nem nyitható meg ebben a böngészőablakban. Próbáld a közzétett TanuljVelem oldalon."); }
  };
  return { mode, seconds, running, completed, track, setTrack, active, setActive, toggle, reset, pipWindow, openPictureInPicture };
}
type TimerState = ReturnType<typeof useTimerState>;
const PomodoroContext = createContext<TimerState | null>(null);
export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const value = useTimerState();
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};
export const usePomodoro = () => {
  const value = useContext(PomodoroContext);
  if (!value) throw new Error("PomodoroProvider is required");
  return value;
};