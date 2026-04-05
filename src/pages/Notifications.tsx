import { useEffect, useState } from "react";
import { Bell, Megaphone, MessageCircle, AtSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NotificationItem = {
  id: string;
  type: "announcement" | "comment" | "mention";
  title: string;
  desc: string;
  date: string;
};

const Notifications = () => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isTeacher = profile?.role === "teacher";

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const items: NotificationItem[] = [];

      if (!isTeacher) {
        const { data: announcements } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        const senderIds = [...new Set((announcements || []).map((a) => a.sender_id))];
        let profileMap = new Map<string, any>();
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username, display_name").in("id", senderIds);
          profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        }

        for (const a of announcements || []) {
          const sender = profileMap.get(a.sender_id);
          const name = sender?.display_name || sender?.username || "Ismeretlen";
          items.push({
            id: `a-${a.id}`,
            type: "announcement",
            title: `Közlemény: ${a.subject || "Általános"}`,
            desc: `${name}: ${a.message.slice(0, 80)}${a.message.length > 80 ? "..." : ""}`,
            date: new Date(a.created_at).toLocaleDateString("hu-HU"),
          });
        }
      } else {
        const { data: myAnnouncements } = await supabase
          .from("announcements")
          .select("id, subject")
          .eq("sender_id", user.id);

        const announcementIds = (myAnnouncements || []).map((a) => a.id);
        const announcementMap = new Map(myAnnouncements?.map((a) => [a.id, a]) || []);

        if (announcementIds.length > 0) {
          const { data: comments } = await supabase
            .from("announcement_comments")
            .select("*")
            .in("announcement_id", announcementIds)
            .order("created_at", { ascending: false })
            .limit(50);

          const commentUserIds = [...new Set((comments || []).map((c) => c.user_id))];
          let cpMap = new Map<string, any>();
          if (commentUserIds.length > 0) {
            const { data: cProfiles } = await supabase.from("profiles").select("id, username, display_name").in("id", commentUserIds);
            cpMap = new Map(cProfiles?.map((p) => [p.id, p]) || []);
          }
          for (const c of comments || []) {
            const commenter = cpMap.get(c.user_id);
            const ann = announcementMap.get(c.announcement_id);
            items.push({
              id: `c-${c.id}`,
              type: "comment",
              title: `Hozzászólás: ${ann?.subject || "Közlemény"}`,
              desc: `${commenter?.display_name || commenter?.username || "Valaki"}: ${c.message.slice(0, 80)}`,
              date: new Date(c.created_at).toLocaleDateString("hu-HU"),
            });
          }
        }
      }

      // Fetch mentions for all users
      const { data: mentions } = await supabase
        .from("mentions")
        .select("*")
        .eq("mentioned_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (mentions && mentions.length > 0) {
        const mentionerIds = [...new Set(mentions.map((m: any) => m.mentioner_user_id))];
        const classIds = [...new Set(mentions.map((m: any) => m.class_id))];
        
        const [{ data: mentionerProfiles }, { data: classesData }] = await Promise.all([
          supabase.from("profiles").select("id, display_name, username").in("id", mentionerIds),
          supabase.from("classes").select("id, name").in("id", classIds),
        ]);

        const mentionerMap = new Map((mentionerProfiles || []).map((p: any) => [p.id, p]));
        const classNameMap = new Map((classesData || []).map((c: any) => [c.id, c.name]));

        for (const m of mentions) {
          const mentioner = mentionerMap.get(m.mentioner_user_id);
          const className = classNameMap.get(m.class_id) || "Osztály";
          items.push({
            id: `m-${m.id}`,
            type: "mention",
            title: `Említés: ${className}`,
            desc: `${mentioner?.display_name || mentioner?.username || "Valaki"} megemlített téged a csoportban.`,
            date: new Date(m.created_at).toLocaleDateString("hu-HU"),
          });
        }
      }

      items.sort((a, b) => {
        const da = new Date(a.date.split(".").reverse().join("-")).getTime();
        const db = new Date(b.date.split(".").reverse().join("-")).getTime();
        return db - da;
      });

      setNotifications(items);
      setLoading(false);
    };
    fetchNotifications();
  }, [user, isTeacher]);

  const iconMap: Record<string, any> = {
    announcement: Megaphone,
    comment: MessageCircle,
    mention: AtSign,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-6">
          <Bell className="w-6 h-6 text-primary" /> Értesítések
        </h1>
        {loading ? (
          <p className="text-muted-foreground text-center py-10">Betöltés...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nincsenek értesítések</p>
            <p className="text-sm mt-1">Új közlemények, hozzászólások és említések itt jelennek meg.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const Icon = iconMap[n.type] || Bell;
              return (
                <div key={n.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    n.type === "mention" ? "bg-accent/20" : "bg-primary/10"
                  }`}>
                    <Icon className={`w-5 h-5 ${n.type === "mention" ? "text-accent-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.desc}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
