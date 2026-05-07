import { motion } from "framer-motion";
import { Flame, Star, Trophy, TrendingUp, Award, Target } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGamification } from "@/hooks/useGamification";
import { BADGES, BadgeId, POINTS, PointAction } from "@/lib/gamification";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderRow {
  user_id: string;
  total_points: number;
  current_streak: number;
  display_name: string | null;
  username: string | null;
}

const Achievements = () => {
  const { stats, badges } = useGamification();
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: top } = await supabase
        .from("user_stats")
        .select("user_id, total_points, current_streak")
        .order("total_points", { ascending: false })
        .limit(10);
      if (!top) return;
      const ids = top.map((t) => t.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", ids);
      const profMap = new Map(profs?.map((p) => [p.id, p]) ?? []);
      setLeaders(
        top.map((t) => ({
          ...t,
          display_name: profMap.get(t.user_id)?.display_name ?? null,
          username: profMap.get(t.user_id)?.username ?? null,
        }))
      );
    })();
  }, []);

  const allBadges = Object.values(BADGES);
  const owned = new Set(badges);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-extrabold mb-2 flex items-center gap-3">
            <Trophy className="w-9 h-9 text-amber-500" />
            Eredmények
          </h1>
          <p className="text-muted-foreground">Pontok, sorozat és jelvények — gyűjts mindennap!</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<Star className="w-6 h-6" />} label="Összes pont" value={stats?.total_points ?? 0} gradient="from-amber-400 to-orange-500" />
          <StatCard icon={<Flame className="w-6 h-6" />} label="Jelenlegi sorozat" value={`${stats?.current_streak ?? 0} nap`} gradient="from-orange-500 to-red-500" />
          <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Leghosszabb sorozat" value={`${stats?.longest_streak ?? 0} nap`} gradient="from-fuchsia-500 to-purple-500" />
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Jelvények ({owned.size}/{allBadges.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allBadges.map((b, idx) => {
              const earned = owned.has(b.id as BadgeId);
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`rounded-2xl p-5 text-center border-2 transition-all ${
                    earned
                      ? `bg-gradient-to-br ${b.color} text-white border-white/30 shadow-lg`
                      : "bg-muted/30 border-border opacity-50 grayscale"
                  }`}
                >
                  <div className="text-5xl mb-2">{b.emoji}</div>
                  <div className="font-bold text-sm">{b.name}</div>
                  <div className={`text-xs mt-1 ${earned ? "text-white/90" : "text-muted-foreground"}`}>{b.description}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Ranglista — Top 10
          </h2>
          <Card className="divide-y divide-border">
            {leaders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Még nincs ranglista adat.</div>
            ) : (
              leaders.map((l, i) => (
                <div key={l.user_id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-700 text-white" : "bg-muted"
                    }`}>{i + 1}</span>
                    <span className="font-semibold">{l.display_name || l.username || "Névtelen"}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4" />{l.current_streak}</span>
                    <span className="flex items-center gap-1 font-bold text-amber-600"><Star className="w-4 h-4 fill-current" />{l.total_points}</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string | number; gradient: string }) => (
  <Card className={`p-6 bg-gradient-to-br ${gradient} text-white border-0`}>
    <div className="flex items-center gap-2 opacity-90 mb-2">{icon}<span className="text-sm font-medium">{label}</span></div>
    <div className="text-3xl font-extrabold">{value}</div>
  </Card>
);

export default Achievements;
