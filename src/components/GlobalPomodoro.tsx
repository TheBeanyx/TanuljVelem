import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro } from "@/hooks/usePomodoro";
import PomodoroWidget from "@/components/PomodoroWidget";

export default function GlobalPomodoro() {
  const { user } = useAuth();
  const { active, pipWindow } = usePomodoro();
  const { pathname } = useLocation();
  if (!user) return null;
  if (pipWindow) return createPortal(<PomodoroWidget embedded />, pipWindow.document.body);
  if (!active || pathname === "/pomodoro") return null;
  return <PomodoroWidget defaultOpen />;
}