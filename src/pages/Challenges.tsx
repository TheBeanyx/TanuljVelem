import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Plus, Sparkles, Calendar, Target, Loader2, CheckCircle2, Flame, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUBJECTS = [
  "Matematika", "Magyar nyelv", "Magyar irodalom", "Történelem",
  "Földrajz", "Biológia", "Fizika", "Kémia", "Angol", "Német",
  "Informatika", "Ének-zene", "Rajz", "Testnevelés", "Etika",
];

type Subscription = {
  id: string;
  subject: string;
  grade: number;
  start_date: string;
  end_date: string;
  status: string;
};

type DailyTask = {
  id: string;
  subscription_id: string;
  task_date: string;
  test_id: string | null;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
  completed_at: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Challenges() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("Matematika");
  const [grade, setGrade] = useState("8");
  const [creating, setCreating] = useState(false);
  const [genId, setGenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: s } = await (supabase as any)
      .from("challenge_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const subList: Subscription[] = s || [];
    setSubs(subList);

    if (subList.length) {
      const { data: t } = await (supabase as any)
        .from("challenge_daily_tasks")
        .select("*")
        .in("subscription_id", subList.map((x) => x.id));
      setTasks(t || []);
    } else {
      setTasks([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const subscribe = async () => {
    if (!user) return;
    setCreating(true);
    // Reject duplicate active subscription for same subject+grade
    const dup = subs.find(
      (x) => x.status === "active" && x.subject === subject && x.grade === Number(grade) && x.end_date >= today()
    );
    if (dup) {
      toast.error("Már feliratkoztál erre a tantárgyra ebben az időszakban.");
      setCreating(false);
      return;
    }
    const { error } = await (supabase as any).from("challenge_subscriptions").insert({
      user_id: user.id,
      subject,
      grade: Number(grade),
    });
    if (error) {
      toast.error("Nem sikerült feliratkozni.");
    } else {
      toast.success("Sikeres feliratkozás! 30 napon át napi feladat vár rád 🎯");
      setOpen(false);
      load();
    }
    setCreating(false);
  };

  const cancelSub = async (id: string) => {
    if (!confirm("Biztos lemondod ezt a kihívást?")) return;
    await (supabase as any).from("challenge_subscriptions").delete().eq("id", id);
    toast.success("Kihívás lemondva.");
    load();
  };

  const generateToday = async (sub: Subscription) => {
    setGenId(sub.id);
    try {
      const topic = `${sub.subject} napi gyakorlás – ${new Date().toLocaleDateString("hu-HU")}`;
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: {
          mode: "test",
          topic,
          grade: sub.grade,
          subject: sub.subject,
          creator_name: "Napi Kihívás",
        },
      });
      if (error || !data?.test_id) throw error || new Error("Nincs teszt");

      await (supabase as any).from("challenge_daily_tasks").insert({
        subscription_id: sub.id,
        user_id: user!.id,
        task_date: today(),
        test_id: data.test_id,
        total_questions: data.count ?? null,
      });
      toast.success("Feladatlap elkészült! Indulhat a teszt.");
      await load();
      navigate("/tests");
    } catch (e) {
      console.error(e);
      toast.error("Nem sikerült feladatlapot generálni.");
    } finally {
      setGenId(null);
    }
  };

  // After user finishes test on /tests, sync the score back into daily task.
  // We poll test_results for each pending task on load.
  useEffect(() => {
    const syncResults = async () => {
      const pending = tasks.filter((t) => t.test_id && !t.completed_at);
      if (!pending.length) return;
      const { data: results } = await supabase
        .from("test_results")
        .select("test_id, score, total_questions, percentage, completed_at")
        .in("test_id", pending.map((p) => p.test_id!));
      if (!results?.length) return;
      for (const p of pending) {
        const r = results.find((x: any) => x.test_id === p.test_id);
        if (r) {
          await (supabase as any).from("challenge_daily_tasks").update({
            score: Math.round((r.percentage as number)),
            total_questions: r.total_questions,
            percentage: r.percentage,
            completed_at: r.completed_at,
          }).eq("id", p.id);
        }
      }
      load();
    };
    syncResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  const subStats = (sub: Subscription) => {
    const subTasks = tasks.filter((t) => t.subscription_id === sub.id);
    const completed = subTasks.filter((t) => t.completed_at);
    const totalDays = Math.ceil(
      (new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / 86400000
    ) + 1;
    const daysPassed = Math.min(
      totalDays,
      Math.ceil((Date.now() - new Date(sub.start_date).getTime()) / 86400000) + 1
    );
    const avg = completed.length
      ? Math.round(completed.reduce((s, t) => s + (Number(t.percentage) || 0), 0) / completed.length)
      : 0;
    const todayTask = subTasks.find((t) => t.task_date === today());
    const isOver = sub.end_date < today();
    return { totalDays, daysPassed, completed: completed.length, avg, todayTask, isOver, subTasks };
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="mb-4">Jelentkezz be a kihívásokhoz.</p>
          <Link to="/login"><Button>Bejelentkezés</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-500" /> 30 Napos Kihívás
            </h1>
            <p className="text-muted-foreground mt-1">
              Iratkozz fel egy tantárgyra — minden nap új feladatlap vár! 100 pontból mérünk, hó végén százalékot kapsz.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="gradient-hero text-white gap-2">
            <Plus className="w-4 h-4" /> Új kihívás
          </Button>
        </motion.div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : subs.length === 0 ? (
          <Card className="p-12 text-center">
            <Flame className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Még nincs aktív kihívásod</h3>
            <p className="text-muted-foreground mb-6">
              Válassz egy tantárgyat és évfolyamot, és 30 napon át minden nap kapsz egy AI által készített feladatlapot.
            </p>
            <Button onClick={() => setOpen(true)} size="lg" className="gradient-hero text-white gap-2">
              <Sparkles className="w-4 h-4" /> Feliratkozás
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subs.map((sub) => {
              const st = subStats(sub);
              const done = !!st.todayTask?.completed_at;
              const generating = genId === sub.id;
              return (
                <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-xl font-bold">{sub.subject}</h3>
                          <Badge variant="secondary">{sub.grade}. évfolyam</Badge>
                          {st.isOver ? (
                            <Badge variant="outline">Befejezve</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Aktív</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {sub.start_date} → {sub.end_date}</span>
                          <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {st.completed}/{st.totalDays} nap teljesítve</span>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Haladás</span>
                            <span>{Math.round((st.completed / st.totalDays) * 100)}%</span>
                          </div>
                          <Progress value={(st.completed / st.totalDays) * 100} />
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Átlagos eredmény</span>
                            <span>{st.avg}%</span>
                          </div>
                          <Progress value={st.avg} className="bg-amber-100 dark:bg-amber-900/30" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:w-56">
                        {st.isOver ? (
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-extrabold">{st.avg}%</p>
                            <p className="text-xs text-muted-foreground">Végső átlag</p>
                          </div>
                        ) : done ? (
                          <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
                            <p className="text-sm font-semibold">Mai feladat kész!</p>
                            <p className="text-xs text-muted-foreground">{Math.round(Number(st.todayTask?.percentage) || 0)} pont / 100</p>
                          </div>
                        ) : st.todayTask?.test_id ? (
                          <Button onClick={() => navigate("/tests")} className="gradient-hero text-white">
                            Mai feladat megnyitása
                          </Button>
                        ) : (
                          <Button onClick={() => generateToday(sub)} disabled={generating} className="gradient-hero text-white gap-2">
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Mai feladat
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => cancelSub(sub.id)} className="text-muted-foreground hover:text-destructive gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Lemondás
                        </Button>
                      </div>
                    </div>

                    {st.subTasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Utolsó eredmények</p>
                        <div className="flex flex-wrap gap-1.5">
                          {st.subTasks
                            .slice()
                            .sort((a, b) => b.task_date.localeCompare(a.task_date))
                            .slice(0, 14)
                            .map((t) => (
                              <div
                                key={t.id}
                                title={`${t.task_date}: ${t.percentage ?? "–"}%`}
                                className={`w-8 h-8 rounded text-[10px] font-bold flex items-center justify-center ${
                                  t.completed_at
                                    ? Number(t.percentage) >= 80
                                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                      : Number(t.percentage) >= 50
                                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {t.completed_at ? `${Math.round(Number(t.percentage))}` : "–"}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új 30 napos kihívás</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tantárgy</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Évfolyam</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <SelectItem key={g} value={String(g)}>{g}. évfolyam</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              30 napon át minden nap kapsz egy AI által generált feladatlapot ebből a tantárgyból. Több tantárgyra is feliratkozhatsz egyszerre!
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
            <Button onClick={subscribe} disabled={creating} className="gradient-hero text-white">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Feliratkozás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
