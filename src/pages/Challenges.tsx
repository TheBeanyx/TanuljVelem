import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trophy, Plus, Sparkles, Calendar, Target, Loader2, CheckCircle2, Flame, Trash2, ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  daily_goal_points: number;
  total_goal_points: number;
};

type DailyTask = {
  id: string;
  subscription_id: string;
  task_date: string;
  task_title: string | null;
  task_type: string | null;
  task_prompt: string | null;
  max_points: number;
  submission: string | null;
  awarded_points: number | null;
  feedback: string | null;
  completed_at: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Challenges() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("Matematika");
  const [grade, setGrade] = useState("8");
  const [dailyGoal, setDailyGoal] = useState("70");
  const [totalGoal, setTotalGoal] = useState("2100");
  const [creating, setCreating] = useState(false);

  // Active task view
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [activeTask, setActiveTask] = useState<DailyTask | null>(null);
  const [submission, setSubmission] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        .in("subscription_id", subList.map((x) => x.id))
        .order("task_date", { ascending: false });
      setTasks(t || []);
    } else setTasks([]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const subscribe = async () => {
    if (!user) return;
    const dg = Math.max(10, Math.min(150, parseInt(dailyGoal) || 70));
    const tg = Math.max(100, Math.min(5000, parseInt(totalGoal) || dg * 30));
    setCreating(true);
    const dup = subs.find(
      (x) => x.status === "active" && x.subject === subject && x.grade === Number(grade) && x.end_date >= today()
    );
    if (dup) { toast.error("Már feliratkoztál erre."); setCreating(false); return; }
    const { error } = await (supabase as any).from("challenge_subscriptions").insert({
      user_id: user.id, subject, grade: Number(grade),
      daily_goal_points: dg, total_goal_points: tg,
    });
    if (error) toast.error("Nem sikerült feliratkozni.");
    else { toast.success("Sikeres feliratkozás! 🎯"); setOpen(false); load(); }
    setCreating(false);
  };

  const cancelSub = async (id: string) => {
    if (!confirm("Biztos lemondod ezt a kihívást?")) return;
    await (supabase as any).from("challenge_subscriptions").delete().eq("id", id);
    toast.success("Kihívás lemondva.");
    load();
  };

  const openTask = async (sub: Subscription) => {
    setActiveSub(sub);
    setSubmission("");
    const existing = tasks.find((t) => t.subscription_id === sub.id && t.task_date === today());
    if (existing) {
      setActiveTask(existing);
      setSubmission(existing.submission || "");
    } else {
      // Generate
      setActiveTask(null);
      setGenerating(true);
      try {
        const recent = tasks.filter((t) => t.subscription_id === sub.id).slice(0, 10).map((t) => t.task_title).filter(Boolean) as string[];
        const dayIndex = Math.ceil((Date.now() - new Date(sub.start_date).getTime()) / 86400000) + 1;
        const { data, error } = await supabase.functions.invoke("challenge-task", {
          body: { mode: "generate", subject: sub.subject, grade: sub.grade, day_index: dayIndex, recent_titles: recent },
        });
        if (error || !data?.prompt_markdown) throw error || new Error("Hiba");
        const { data: inserted, error: insErr } = await (supabase as any).from("challenge_daily_tasks").insert({
          subscription_id: sub.id,
          user_id: user!.id,
          task_date: today(),
          task_title: data.title,
          task_type: data.task_type,
          task_prompt: data.prompt_markdown,
          max_points: data.max_points || 100,
        }).select().single();
        if (insErr) throw insErr;
        setActiveTask(inserted);
        await load();
      } catch (e) {
        console.error(e);
        toast.error("Nem sikerült feladatot generálni.");
        setActiveSub(null);
      } finally {
        setGenerating(false);
      }
    }
  };

  const submitAnswer = async () => {
    if (!activeTask || !activeSub) return;
    if (submission.trim().length < 5) { toast.error("Írj egy érdemi megoldást."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("challenge-task", {
        body: {
          mode: "evaluate",
          subject: activeSub.subject,
          grade: activeSub.grade,
          task_title: activeTask.task_title,
          task_prompt: activeTask.task_prompt,
          submission,
          max_points: activeTask.max_points,
        },
      });
      if (error || data?.awarded_points == null) throw error || new Error("Hiba");
      const upd = {
        submission,
        awarded_points: data.awarded_points,
        feedback: data.feedback_markdown,
        completed_at: new Date().toISOString(),
      };
      await (supabase as any).from("challenge_daily_tasks").update(upd).eq("id", activeTask.id);
      setActiveTask({ ...activeTask, ...upd });
      toast.success(`Értékelve: ${data.awarded_points}/${activeTask.max_points} pont`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Nem sikerült értékelni.");
    } finally {
      setSubmitting(false);
    }
  };

  const subStats = (sub: Subscription) => {
    const subTasks = tasks.filter((t) => t.subscription_id === sub.id);
    const completed = subTasks.filter((t) => t.completed_at);
    const totalDays = Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / 86400000) + 1;
    const totalEarned = completed.reduce((s, t) => s + (t.awarded_points || 0), 0);
    const totalMax = completed.reduce((s, t) => s + (t.max_points || 0), 0) || 1;
    const avgPct = Math.round((totalEarned / totalMax) * 100);
    const todayTask = subTasks.find((t) => t.task_date === today());
    const isOver = sub.end_date < today();
    return { totalDays, completed: completed.length, totalEarned, avgPct, todayTask, isOver, subTasks };
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 text-center"><p className="mb-4">Jelentkezz be.</p><Link to="/login"><Button>Bejelentkezés</Button></Link></Card>
    </div>
  );

  // === TASK VIEW ===
  if (activeSub) {
    const todayPct = activeTask?.awarded_points != null
      ? Math.round(((activeTask.awarded_points) / (activeTask.max_points || 1)) * 100) : 0;
    const meetsDaily = activeTask?.awarded_points != null && activeTask.awarded_points >= activeSub.daily_goal_points;
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Button variant="ghost" onClick={() => { setActiveSub(null); setActiveTask(null); }} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Vissza
          </Button>

          {generating ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="font-semibold">Készül a mai kreatív feladatod…</p>
            </Card>
          ) : activeTask ? (
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary">{activeSub.subject}</Badge>
                <Badge variant="outline">{activeSub.grade}. évf.</Badge>
                {activeTask.task_type && <Badge className="bg-primary/10 text-primary border-0">{activeTask.task_type}</Badge>}
                <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                  Max {activeTask.max_points} pont
                </Badge>
              </div>
              <h2 className="text-2xl font-extrabold mb-4">{activeTask.task_title}</h2>

              <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                <ReactMarkdown>{activeTask.task_prompt || ""}</ReactMarkdown>
              </div>

              <Label className="font-semibold">A te megoldásod</Label>
              <Textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder="Itt írd a kreatív megoldásodat…"
                rows={10}
                disabled={!!activeTask.completed_at}
                className="mt-2"
              />

              {activeTask.completed_at ? (
                <div className="mt-6 space-y-4">
                  <div className={`p-4 rounded-lg ${meetsDaily ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Eredmény: {activeTask.awarded_points} / {activeTask.max_points} pont ({todayPct}%)
                      </span>
                      <Badge variant={meetsDaily ? "default" : "outline"}>
                        Napi cél: {activeSub.daily_goal_points}
                      </Badge>
                    </div>
                    <Progress value={todayPct} />
                  </div>
                  {activeTask.feedback && (
                    <Card className="p-4 bg-muted/40">
                      <p className="text-sm font-semibold mb-2">💬 AI visszajelzés</p>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{activeTask.feedback}</ReactMarkdown>
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <Button onClick={submitAnswer} disabled={submitting} className="mt-4 gradient-hero text-white gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Beküldés és értékelés
                </Button>
              )}
            </Card>
          ) : null}
        </main>
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-500" /> 30 Napos Kreatív Kihívás
            </h1>
            <p className="text-muted-foreground mt-1">
              Minden nap egy egyedi, kreatív feladat — saját napi és összesített pontcéllal.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="gradient-hero text-white gap-2">
            <Plus className="w-4 h-4" /> Új kihívás
          </Button>
        </motion.div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : subs.length === 0 ? (
          <Card className="p-12 text-center">
            <Flame className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Még nincs aktív kihívásod</h3>
            <p className="text-muted-foreground mb-6">Indíts egyet és minden nap új kreatív feladat vár!</p>
            <Button onClick={() => setOpen(true)} size="lg" className="gradient-hero text-white gap-2">
              <Sparkles className="w-4 h-4" /> Feliratkozás
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subs.map((sub) => {
              const st = subStats(sub);
              const done = !!st.todayTask?.completed_at;
              const totalPct = Math.min(100, Math.round((st.totalEarned / sub.total_goal_points) * 100));
              return (
                <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-xl font-bold">{sub.subject}</h3>
                          <Badge variant="secondary">{sub.grade}. évf.</Badge>
                          {st.isOver
                            ? <Badge variant="outline">Befejezve</Badge>
                            : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Aktív</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mb-4">
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{sub.start_date} → {sub.end_date}</span>
                          <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" />Napi cél: {sub.daily_goal_points} pont</span>
                          <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />Havi cél: {sub.total_goal_points} pont</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Havi pontok</span>
                              <span>{st.totalEarned} / {sub.total_goal_points} ({totalPct}%)</span>
                            </div>
                            <Progress value={totalPct} />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Teljesített napok</span>
                              <span>{st.completed} / {st.totalDays}</span>
                            </div>
                            <Progress value={(st.completed / st.totalDays) * 100} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:w-56">
                        {st.isOver ? (
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-extrabold">{st.totalEarned}</p>
                            <p className="text-xs text-muted-foreground">pont · átlag {st.avgPct}%</p>
                          </div>
                        ) : done ? (
                          <Button onClick={() => openTask(sub)} variant="outline" className="gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Mai kész ({st.todayTask?.awarded_points}/{st.todayTask?.max_points})
                          </Button>
                        ) : (
                          <Button onClick={() => openTask(sub)} className="gradient-hero text-white gap-2">
                            <Sparkles className="w-4 h-4" /> Mai feladat
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => cancelSub(sub.id)} className="text-muted-foreground hover:text-destructive gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Lemondás
                        </Button>
                      </div>
                    </div>

                    {st.subTasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Utolsó napi pontok</p>
                        <div className="flex flex-wrap gap-1.5">
                          {st.subTasks.slice(0, 14).map((t) => {
                            const pct = t.completed_at && t.max_points ? Math.round(((t.awarded_points || 0) / t.max_points) * 100) : null;
                            return (
                              <div key={t.id} title={`${t.task_date}: ${t.awarded_points ?? "–"}/${t.max_points}`}
                                className={`min-w-[44px] h-9 px-2 rounded text-[11px] font-bold flex items-center justify-center ${
                                  pct == null ? "bg-muted text-muted-foreground"
                                  : pct >= 80 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : pct >= 50 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                }`}>
                                {t.awarded_points ?? "–"}/{t.max_points}
                              </div>
                            );
                          })}
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
          <DialogHeader><DialogTitle>Új 30 napos kreatív kihívás</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tantárgy</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Napi pontcél</Label>
                <Input type="number" min={10} max={150} value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">Hány pontot szeretnél naponta elérni?</p>
              </div>
              <div>
                <Label>Havi pontcél</Label>
                <Input type="number" min={100} max={5000} value={totalGoal} onChange={(e) => setTotalGoal(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">30 nap alatt összesen.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minden nap egy AI által tervezett kreatív feladatot kapsz (fogalmazás, gondolatkísérlet, projekt stb.) — nem feleletválasztós!
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
