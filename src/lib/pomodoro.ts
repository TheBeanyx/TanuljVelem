export type PomodoroMode = "focus" | "short" | "long";
export const DURATIONS: Record<PomodoroMode, number> = { focus: 1500, short: 300, long: 900 };
export const remainingSeconds = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));
export const pomodoroPlacement = (pathname: string, active: boolean, externalWindow: boolean) => {
  if (pathname === "/pomodoro") return "page";
  if (externalWindow) return "external";
  return active ? "floating" : "hidden";
};