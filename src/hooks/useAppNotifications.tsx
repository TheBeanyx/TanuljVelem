import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/notificationPrefs";

const DUE_KEY = "tv_hw_due_notified";
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Homework-due reminders + realtime alerts for new private messages. */
export const useAppNotifications = () => {
  const { user } = useAuth();

  // Homework due tomorrow (checked once a day, plus hourly while the app is open)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      if (localStorage.getItem(DUE_KEY) === todayStr()) return;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const target = tomorrow.toISOString().slice(0, 10);

      const { data } = await supabase
        .from("homeworks")
        .select("id, title, subject")
        .eq("deadline", target);
      if (!data?.length) return;

      const { data: done } = await supabase
        .from("homework_completions")
        .select("homework_id")
        .eq("user_id", user.id)
        .in("homework_id", data.map((h) => h.id));
      const doneIds = new Set((done || []).map((d: any) => d.homework_id));
      const open = data.filter((h) => !doneIds.has(h.id));
      if (!open.length) return;

      localStorage.setItem(DUE_KEY, todayStr());
      notify(
        "homework_due",
        "Holnap lejár egy házi feladat! 📚",
        open.length === 1
          ? `${open[0].subject}: ${open[0].title}`
          : `${open.length} házi feladat határideje holnap.`,
        "/dashboard"
      );
    };

    check();
    const t = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user]);

  // New private messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-dm")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` },
        (payload: any) => {
          const text: string = payload.new?.text || "";
          notify(
            "new_message",
            "Új üzenet érkezett 💬",
            text.length > 80 ? `${text.slice(0, 80)}…` : text,
            "/messages"
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};

export default useAppNotifications;
