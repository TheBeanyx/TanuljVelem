import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro } from "@/hooks/usePomodoro";
import PomodoroWidget from "@/components/PomodoroWidget";
import { pomodoroPlacement } from "@/lib/pomodoro";

export default function GlobalPomodoro() {
  const { user } = useAuth();
  const { active, pipWindow } = usePomodoro();
  const { pathname } = useLocation();
  const placement = pomodoroPlacement(pathname, active, Boolean(pipWindow && !pipWindow.closed));
  useEffect(() => {
    if (placement === "page" && pipWindow && !pipWindow.closed) pipWindow.close();
  }, [placement, pipWindow]);
  if (!user) return null;
  if (placement === "external" && pipWindow) return createPortal(<PomodoroWidget embedded />, pipWindow.document.body);
  if (placement !== "floating") return null;
  return <PomodoroWidget defaultOpen />;
}