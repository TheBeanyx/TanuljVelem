import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro } from "@/hooks/usePomodoro";
import PomodoroWidget from "@/components/PomodoroWidget";
import { pomodoroPlacement } from "@/lib/pomodoro";

export default function GlobalPomodoro() {
  const { user } = useAuth();
  const { active, pipWindow } = usePomodoro();
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const placement = pomodoroPlacement(pathname, active, Boolean(pipWindow && !pipWindow.closed));
  useEffect(() => {
    if (previousPath.current !== pathname && placement === "page" && pipWindow && !pipWindow.closed) pipWindow.close();
    previousPath.current = pathname;
  }, [pathname, placement, pipWindow]);
  if (placement === "page" && pipWindow && !pipWindow.closed) return createPortal(<PomodoroWidget embedded />, pipWindow.document.body);
  if (!user) return null;
  if (placement === "external" && pipWindow) return createPortal(<PomodoroWidget embedded />, pipWindow.document.body);
  if (placement !== "floating") return null;
  return <PomodoroWidget defaultOpen />;
}