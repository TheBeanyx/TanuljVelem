import { motion } from "framer-motion";
import { Flame, Star, Trophy, TrendingUp, Award, Target } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGamification } from "@/hooks/useGamification";
import { BADGES, BadgeId } from "@/lib/gamification";
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
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<BadgeId | null>(null);

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

  // Per-action event counts for progress badges
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("point_events")
        .select("action")
        .eq("user_id", user.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: { action: string }) => {
        counts[r.action] = (counts[r.action] || 0) + 1;
      });
      setActionCounts(counts);
    })();
  }, [user]);

  const allBadges = Object.values(BADGES);
  const owned = new Set(badges);

  // Returns { current, target, label, task } for a badge.
  const progressOf = (id: BadgeId): { current: number; target: number; label: string; task: string } => {
    const points = stats?.total_points ?? 0;
    const streak = stats?.current_streak ?? 0;
    const longest = stats?.longest_streak ?? 0;
    const has = (b: BadgeId) => owned.has(b);
    switch (id) {
      case "first_steps": return { current: Math.min(points, 1), target: 1, label: "pont", task: "Szerezz meg legalább 1 pontot bármilyen tevékenységgel." };
      case "points_100": return { current: points, target: 100, label: "pont", task: "Gyűjts össze 100 pontot — pl. tesztek, házik, AI használat." };
      case "points_500": return { current: points, target: 500, label: "pont", task: "Gyűjts össze 500 pontot a platformon." };
      case "points_1000": return { current: points, target: 1000, label: "pont", task: "Érd el az 1000 pontos elit szintet." };
      case "points_5000": return { current: points, target: 5000, label: "pont", task: "Hihetetlen! Gyűjts össze 5000 pontot." };
      case "streak_3": return { current: Math.max(streak, has("streak_3") ? 3 : 0), target: 3, label: "nap", task: "Lépj be 3 napon át egymás után." };
      case "streak_7": return { current: Math.max(streak, has("streak_7") ? 7 : 0), target: 7, label: "nap", task: "Egy teljes hét megszakítás nélküli tanulás." };
      case "streak_14": return { current: Math.max(streak, has("streak_14") ? 14 : 0), target: 14, label: "nap", task: "14 napos sorozat — komoly elhivatottság." };
      case "streak_30": return { current: Math.max(streak, has("streak_30") ? 30 : 0), target: 30, label: "nap", task: "30 napos folyamatos sorozat — a legendák klubja." };
      case "streak_100": return { current: Math.max(longest, has("streak_100") ? 100 : 0), target: 100, label: "nap", task: "100 nap egymás után — őrület!" };
      case "test_master": return { current: has("test_master") ? 1 : 0, target: 1, label: "tökéletes", task: "Érj el 100%-ot egy teljes teszten." };
      case "test_marathon": return { current: (actionCounts["complete_test"] || 0) + (actionCounts["perfect_test"] || 0), target: 10, label: "teszt", task: "Teljesíts 10 tesztet." };
      case "homework_hero": return { current: actionCounts["create_homework"] || 0, target: 10, label: "házi", task: "Rögzíts 10 házi feladatot." };
      case "homework_legend": return { current: actionCounts["create_homework"] || 0, target: 50, label: "házi", task: "Rögzíts 50 házi feladatot." };
      case "flashcard_fan": return { current: actionCounts["create_flashcard_set"] || 0, target: 5, label: "csomag", task: "Hozz létre 5 flashcard csomagot." };
      case "flashcard_master": return { current: actionCounts["create_flashcard_set"] || 0, target: 20, label: "csomag", task: "Hozz létre 20 flashcard csomagot." };
      case "note_taker": return { current: actionCounts["create_note"] || 0, target: 5, label: "jegyzet", task: "Írj 5 jegyzetet." };
      case "note_scholar": return { current: actionCounts["create_note"] || 0, target: 20, label: "jegyzet", task: "Írj 20 jegyzetet." };
      case "pdf_explorer": return { current: actionCounts["pdf_analyzed"] || 0, target: 1, label: "PDF", task: "Elemezz egy PDF-et az AI-val a PDF elemzőben." };
      case "pdf_pro": return { current: actionCounts["pdf_analyzed"] || 0, target: 10, label: "PDF", task: "Elemezz 10 PDF dokumentumot." };
      case "social_butterfly": return { current: actionCounts["join_class"] || 0, target: 1, label: "osztály", task: "Csatlakozz az első osztályodhoz." };
      case "class_collector": return { current: actionCounts["join_class"] || 0, target: 5, label: "osztály", task: "Légy 5 osztály tagja." };
      case "ai_apprentice": return { current: actionCounts["ai_generation"] || 0, target: 1, label: "generálás", task: "Használd először az AI generálást a Tanulás oldalon." };
      case "ai_expert": return { current: actionCounts["ai_generation"] || 0, target: 25, label: "generálás", task: "Használd 25-ször az AI generálást." };
      case "tutor_chat": return { current: actionCounts["tutor_message"] || 0, target: 1, label: "üzenet", task: "Beszélgess először az AI tanárral." };
      case "chatterbox": return { current: actionCounts["tutor_message"] || 0, target: 100, label: "üzenet", task: "Küldj 100 üzenetet az AI tanárnak." };
      case "early_bird": return { current: has("early_bird") ? 1 : 0, target: 1, label: "", task: "Tanulj reggel 7 óra előtt." };
      case "night_owl": return { current: has("night_owl") ? 1 : 0, target: 1, label: "", task: "Tanulj este 10 óra után." };
      case "weekend_warrior": return { current: has("weekend_warrior") ? 1 : 0, target: 1, label: "", task: "Tanulj szombaton ÉS vasárnap is ugyanazon a hétvégén." };
      case "comeback_kid": return { current: has("comeback_kid") ? 1 : 0, target: 1, label: "", task: "Térj vissza legalább 7 napos szünet után." };
      default: return { current: 0, target: 1, label: "", task: "" };
    }
  };

  const selectedBadge = selected ? BADGES[selected] : null;
  const selectedProgress = selected ? progressOf(selected) : null;
  const selectedPct = selectedProgress ? Math.min(100, Math.round((selectedProgress.current / selectedProgress.target) * 100)) : 0;

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
              const p = progressOf(b.id as BadgeId);
              const pct = Math.min(100, Math.round((p.current / p.target) * 100));
              return (
                <motion.button
                  type="button"
                  onClick={() => setSelected(b.id as BadgeId)}
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ scale: 1.03 }}
                  className={`text-left rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                    earned
                      ? `bg-gradient-to-br ${b.color} text-white border-white/30 shadow-lg`
                      : "bg-muted/30 border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`text-5xl mb-2 text-center ${earned ? "" : "grayscale opacity-60"}`}>{b.emoji}</div>
                  <div className="font-bold text-sm text-center">{b.name}</div>
                  <div className={`text-xs mt-1 text-center ${earned ? "text-white/90" : "text-muted-foreground"}`}>{b.description}</div>
                  {!earned && (
                    <div className="mt-3 space-y-1">
                      <Progress value={pct} className="h-1.5" />
                      <div className="text-[10px] text-muted-foreground text-center font-medium">
                        {p.current}/{p.target} {p.label}
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-md">
            {selectedBadge && selectedProgress && (
              <>
                <DialogHeader>
                  <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-3 bg-gradient-to-br ${selectedBadge.color} ${owned.has(selected!) ? "" : "grayscale opacity-60"}`}>
                    {selectedBadge.emoji}
                  </div>
                  <DialogTitle className="text-center text-2xl">{selectedBadge.name}</DialogTitle>
                  <DialogDescription className="text-center">{selectedBadge.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                      <Target className="w-4 h-4 text-primary" /> Feladat
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedProgress.task}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="font-semibold">Haladás</span>
                      <span className="font-bold text-primary">{selectedProgress.current}/{selectedProgress.target} {selectedProgress.label}</span>
                    </div>
                    <Progress value={selectedPct} className="h-3" />
                    <div className="text-right text-xs text-muted-foreground mt-1">{selectedPct}%</div>
                  </div>
                  {owned.has(selected!) && (
                    <div className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Megszerezve!
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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
