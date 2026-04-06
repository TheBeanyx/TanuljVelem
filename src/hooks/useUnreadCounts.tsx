import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UnreadCounts = {
  messages: number;
  classes: number;
  notifications: number;
};

export const useUnreadCounts = () => {
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, classes: 0, notifications: 0 });
  const { user, profile } = useAuth();

  const fetchCounts = async () => {
    if (!user) return;

    // Get all read statuses for this user
    const { data: readStatuses } = await supabase
      .from("read_status")
      .select("channel_type, channel_id, last_read_at")
      .eq("user_id", user.id);

    const readMap = new Map<string, string>();
    (readStatuses || []).forEach((r: any) => {
      readMap.set(`${r.channel_type}:${r.channel_id}`, r.last_read_at);
    });

    // 1. Unread DMs
    const { data: dms } = await supabase
      .from("direct_messages")
      .select("sender_id, created_at")
      .eq("receiver_id", user.id);

    let dmCount = 0;
    const dmSenders = new Set((dms || []).map((m: any) => m.sender_id));
    for (const senderId of dmSenders) {
      const lastRead = readMap.get(`dm:${senderId}`);
      const unread = (dms || []).filter(
        (m: any) => m.sender_id === senderId && (!lastRead || new Date(m.created_at) > new Date(lastRead))
      );
      dmCount += unread.length;
    }

    // 2. Unread class messages
    const { data: memberships } = await supabase.from("class_members").select("class_id").eq("user_id", user.id);
    const { data: ownedClasses } = await supabase.from("classes").select("id").eq("owner_id", user.id);
    const classIds = [...new Set([
      ...(memberships || []).map((m: any) => m.class_id),
      ...(ownedClasses || []).map((c: any) => c.id),
    ])];

    let classCount = 0;
    for (const classId of classIds) {
      const lastRead = readMap.get(`class:${classId}`);
      const { count } = await supabase
        .from("class_messages")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId)
        .neq("user_id", user.id)
        .gt("created_at", lastRead || "1970-01-01T00:00:00Z");
      classCount += count || 0;
    }

    // 3. Unread notifications (announcements/comments)
    const lastNotifRead = readMap.get("notif:all");
    const isTeacher = profile?.role === "teacher";

    let notifCount = 0;
    if (isTeacher) {
      // Teacher sees comments on their announcements
      const { data: myAnnouncements } = await supabase.from("announcements").select("id").eq("sender_id", user.id);
      const annIds = (myAnnouncements || []).map((a: any) => a.id);
      if (annIds.length > 0) {
        const { count } = await supabase
          .from("announcement_comments")
          .select("*", { count: "exact", head: true })
          .in("announcement_id", annIds)
          .neq("user_id", user.id)
          .gt("created_at", lastNotifRead || "1970-01-01T00:00:00Z");
        notifCount += count || 0;
      }
    } else {
      // Student sees announcements addressed to them
      const { count } = await supabase
        .from("announcements")
        .select("*", { count: "exact", head: true })
        .or(`visibility.eq.public,recipient_id.eq.${user.id}`)
        .gt("created_at", lastNotifRead || "1970-01-01T00:00:00Z");
      notifCount += count || 0;
    }

    // Mentions
    const { count: mentionCount } = await supabase
      .from("mentions")
      .select("*", { count: "exact", head: true })
      .eq("mentioned_user_id", user.id)
      .gt("created_at", lastNotifRead || "1970-01-01T00:00:00Z");
    notifCount += mentionCount || 0;

    setCounts({ messages: dmCount, classes: classCount, notifications: notifCount });
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [user, profile]);

  const markRead = async (channelType: string, channelId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("read_status")
      .select("id")
      .eq("user_id", user.id)
      .eq("channel_type", channelType)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existing) {
      await supabase.from("read_status").update({ last_read_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("read_status").insert({
        user_id: user.id,
        channel_type: channelType,
        channel_id: channelId,
        last_read_at: new Date().toISOString(),
      });
    }
    fetchCounts();
  };

  return { counts, markRead, refresh: fetchCounts };
};
