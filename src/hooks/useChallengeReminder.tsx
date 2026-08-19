import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const REMINDER_HOUR = 17;
const STORAGE_KEY = "tv_challenge_reminder_sent";

const todayStr = () => new Date().toISOString().slice(0, 10);

const showReminder = async (title: string, body: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg?.active) {
    reg.active.postMessage({ type: "SHOW_REMINDER", title, body, url: "/challenges", tag: "tv-challenge" });
  } else {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
};

/** Registers the service worker and fires a 17:00 local reminder
 *  if the user is subscribed to a challenge but hasn't finished today's tasks. */
export const useChallengeReminder = () => {
  const { user } = useAuth();

  // Register service worker once
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      const now = new Date();
      const day = todayStr();
      if (now.getHours() < REMINDER_HOUR) return;
      if (localStorage.getItem(STORAGE_KEY) === day) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const { data: subs } = await (supabase as any)
        .from("challenge_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (!subs?.length) return;

      const { data: done } = await (supabase as any)
        .from("challenge_daily_tasks")
        .select("id, completed_at")
        .in("subscription_id", subs.map((s: any) => s.id))
        .eq("task_date", day);

      const allDone = done?.length === subs.length && done.every((t: any) => t.completed_at);
      if (allDone) return;

      localStorage.setItem(STORAGE_KEY, day);
      showReminder("Ma még nincs kész a kihívás! 🔥", "Nyisd meg a napi kreatív feladatokat, és tartsd meg a sorozatod.");
    };

    check();
    const iv = setInterval(check, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user?.id]);
};

export default useChallengeReminder;
