import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Trophy, Plus, Sparkles, Calendar, Target, Loader2, CheckCircle2,
  Flame, Trash2, ArrowLeft, Clock, RefreshCw, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardNav from "@/components/DashboardNav";
import ChallengeTaskRenderer from "@/components/ChallengeTaskRenderer";
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
  daily_goal_points: number;
  total_goal_points: number;
};

type SubTask = {
  id: string;
  title: string;
  task_type: string;
  est_minutes: number;
  max_points: number;
  data: any; // full type-specific payload from AI
  submission?: string | null;
  awarded_points?: number | null;
  feedback?: string | null;
  completed_at?: string | null;
};

type DailyTask = {
  id: string;
  subscription_id: string;
  task_date: string;
  task_title: string | null;
  max_points: number;
  awarded_points: number | null;
  completed_at: string | null;
  subtasks: SubTask[];
};

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

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
  const [generating, setGenerating] = useState(false);
  const [openSubtaskId, setOpenSubtaskId] = useState<string | null>(null);
  const [submissionDraft, setSubmissionDraft] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);

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
      setTasks((t || []).map((row: any) => ({ ...row, subtasks: row.subtasks || [] })));
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
    setSubmissionDraft({});
    const existing = tasks.find((t) => t.subscription_id === sub.id && t.task_date === today());
    if (existing && existing.subtasks?.length) {
      setActiveTask(existing);
      const drafts: Record<string, string> = {};
      existing.subtasks.forEach((st) => { drafts[st.id] = st.submission || ""; });
      setSubmissionDraft(drafts);
      setOpenSubtaskId(existing.subtasks.find((s) => !s.completed_at)?.id || existing.subtasks[0].id);
    } else {
      setActiveTask(null);
      setGenerating(true);
      try {
        const recent = tasks
          .filter((t) => t.subscription_id === sub.id)
          .flatMap((t) => (t.subtasks || []).map((s) => s.title))
          .filter(Boolean) as string[];
        const dayIndex = Math.ceil((Date.now() - new Date(sub.start_date).getTime()) / 86400000) + 1;
        const { data, error } = await supabase.functions.invoke("challenge-task", {
          body: {
            mode: "generate",
            subject: sub.subject, grade: sub.grade,
            day_index: dayIndex, recent_titles: recent,
            daily_goal_points: sub.daily_goal_points,
          },
        });
        if (error || !data?.tasks?.length) throw error || new Error("Hiba");
        const subtasks: SubTask[] = data.tasks.map((t: any) => ({
          id: uid(),
          title: t.title,
          task_type: t.task_type,
          est_minutes: t.est_minutes || 5,
          max_points: t.max_points || 15,
          data: t,
          submission: null, awarded_points: null, feedback: null, completed_at: null,
        }));
        const totalMax = subtasks.reduce((s, x) => s + x.max_points, 0);
        const { data: inserted, error: insErr } = await (supabase as any).from("challenge_daily_tasks").insert({
          subscription_id: sub.id,
          user_id: user!.id,
          task_date: today(),
          task_title: data.day_title || `${sub.subject} – nap ${dayIndex}`,
          task_type: "mixed",
          task_prompt: data.day_title || null,
          max_points: totalMax,
          subtasks,
        }).select().single();
        if (insErr) throw insErr;
        const row: DailyTask = { ...inserted, subtasks };
        setActiveTask(row);
        const drafts: Record<string, string> = {};
        subtasks.forEach((st) => { drafts[st.id] = ""; });
        setSubmissionDraft(drafts);
        setOpenSubtaskId(subtasks[0].id);
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

  const persistTask = async (next: DailyTask) => {
    const totalAwarded = next.subtasks.reduce((s, x) => s + (x.awarded_points || 0), 0);
    const allDone = next.subtasks.every((x) => x.completed_at);
    await (supabase as any).from("challenge_daily_tasks").update({
      subtasks: next.subtasks,
      awarded_points: totalAwarded,
      completed_at: allDone ? new Date().toISOString() : null,
    }).eq("id", next.id);
  };

  // For writing tasks: AI evaluation
  const submitWriting = async (st: SubTask) => {
    if (!activeTask || !activeSub) return;
    const text = (submissionDraft[st.id] || "").trim();
    if (text.length < 2) { toast.error("Írj valamit."); return; }
    setSubmittingId(st.id);
    try {
      const { data, error } = await supabase.functions.invoke("challenge-task", {
        body: {
          mode: "evaluate",
          subject: activeSub.subject, grade: activeSub.grade,
          task_title: st.title, task_prompt: st.data?.prompt_markdown || "",
          submission: text, max_points: st.max_points,
        },
      });
      if (error || data?.awarded_points == null) throw error || new Error("Hiba");
      await finalizeSubtask(st, {
        submission: text,
        awarded_points: data.awarded_points,
        feedback: data.feedback_markdown,
      });
    } catch (e) {
      console.error(e);
      toast.error("Nem sikerült értékelni.");
    } finally {
      setSubmittingId(null);
    }
  };

  // For interactive tasks: client-side scoring already done
  const submitInteractive = async (st: SubTask, result: { awarded_points: number; feedback_markdown: string; submission_summary: string }) => {
    await finalizeSubtask(st, {
      submission: result.submission_summary,
      awarded_points: result.awarded_points,
      feedback: result.feedback_markdown,
    });
  };

  const finalizeSubtask = async (st: SubTask, res: { submission: string; awarded_points: number; feedback: string }) => {
    if (!activeTask) return;
    const updatedSt: SubTask = {
      ...st,
      submission: res.submission,
      awarded_points: res.awarded_points,
      feedback: res.feedback,
      completed_at: new Date().toISOString(),
    };
    const next: DailyTask = {
      ...activeTask,
      subtasks: activeTask.subtasks.map((x) => x.id === st.id ? updatedSt : x),
    };
    await persistTask(next);
    setActiveTask(next);
    toast.success(`${res.awarded_points}/${st.max_points} pont 🎯`);
    const nextUndone = next.subtasks.find((x) => !x.completed_at);
    if (nextUndone) setOpenSubtaskId(nextUndone.id);
    await load();
  };

  const regenerateSubtask = async (st: SubTask) => {
    if (!activeTask || !activeSub) return;
    if (st.completed_at) { toast.error("Már beküldött feladatot nem cserélhetsz."); return; }
    setRegenId(st.id);
    try {
      const dayIndex = Math.ceil((Date.now() - new Date(activeSub.start_date).getTime()) / 86400000) + 1;
      const { data, error } = await supabase.functions.invoke("challenge-task", {
        body: {
          mode: "regenerate_one",
          subject: activeSub.subject, grade: activeSub.grade,
          exclude_titles: activeTask.subtasks.map((x) => x.title),
          task_type: st.task_type,
          day_index: dayIndex,
        },
      });
      if (error || !data?.title) throw error || new Error("Hiba");
      const replaced: SubTask = {
        id: st.id,
        title: data.title,
        task_type: data.task_type || st.task_type,
        est_minutes: data.est_minutes || 5,
        max_points: data.max_points || st.max_points,
        data,
        submission: null, awarded_points: null, feedback: null, completed_at: null,
      };
      const next: DailyTask = {
        ...activeTask,
        subtasks: activeTask.subtasks.map((x) => x.id === st.id ? replaced : x),
        max_points: activeTask.subtasks.reduce((s, x) => s + (x.id === st.id ? replaced.max_points : x.max_points), 0),
      };
      await (supabase as any).from("challenge_daily_tasks").update({
        subtasks: next.subtasks, max_points: next.max_points,
      }).eq("id", next.id);
      setActiveTask(next);
      setSubmissionDraft((d) => ({ ...d, [st.id]: "" }));
      toast.success("Új feladat generálva! ✨");
    } catch (e) {
      console.error(e);
      toast.error("Nem sikerült új feladatot generálni.");
    } finally {
      setRegenId(null);
    }
  };

  const subStats = (sub: Subscription) => {
    const subTasks = tasks.filter((t) => t.subscription_id === sub.id);
    const completedDays = subTasks.filter((t) => t.completed_at);
    const totalDays = Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / 86400000) + 1;
    const totalEarned = subTasks.reduce(
      (s, t) => s + (t.subtasks || []).reduce((ss, x) => ss + (x.awarded_points || 0), 0), 0,
    );
    const totalMax = subTasks.reduce(
      (s, t) => s + (t.subtasks || []).reduce((ss, x) => ss + (x.completed_at ? x.max_points : 0), 0), 0,
    ) || 1;
    const avgPct = Math.round((totalEarned / totalMax) * 100);
    const todayTask = subTasks.find((t) => t.task_date === today());
    const isOver = sub.end_date < today();

    // Streak: consecutive recent days (counting back from today/yesterday) meeting daily goal
    let streak = 0;
    const sortedByDate = [...subTasks].sort((a, b) => b.task_date.localeCompare(a.task_date));
    let cursor = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    // if today not done yet, start from yesterday
    const todayRow = sortedByDate.find((t) => t.task_date === fmt(cursor));
    if (!todayRow || !todayRow.completed_at) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      const ds = fmt(cursor);
      const row = sortedByDate.find((t) => t.task_date === ds);
      const earned = row ? (row.subtasks || []).reduce((s, x) => s + (x.awarded_points || 0), 0) : 0;
      if (row && earned >= sub.daily_goal_points) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    return { totalDays, completed: completedDays.length, totalEarned, avgPct, todayTask, isOver, subTasks, streak };
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 text-center"><p className="mb-4">Jelentkezz be.</p><Link to="/login"><Button>Bejelentkezés</Button></Link></Card>
    </div>
  );

  // === TASK VIEW ===
  if (activeSub) {
    const totalAwarded = activeTask?.subtasks.reduce((s, x) => s + (x.awarded_points || 0), 0) || 0;
    const totalMax = activeTask?.subtasks.reduce((s, x) => s + x.max_points, 0) || 0;
    const dayPct = totalMax ? Math.round((totalAwarded / totalMax) * 100) : 0;
    const goalPct = Math.min(100, Math.round((totalAwarded / activeSub.daily_goal_points) * 100));
    const meetsDaily = totalAwarded >= activeSub.daily_goal_points;
    const doneCount = activeTask?.subtasks.filter((x) => x.completed_at).length || 0;
    const allCount = activeTask?.subtasks.length || 0;

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
              <p className="font-semibold">Készülnek a mai mini-feladataid…</p>
              <p className="text-sm text-muted-foreground mt-1">6 változatos interaktív feladat – írás, kvíz, párosítás, csoportosítás és még sok más!</p>
            </Card>
          ) : activeTask ? (
            <>
              {/* Day header */}
              <Card className="p-6 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary">{activeSub.subject}</Badge>
                  <Badge variant="outline">{activeSub.grade}. évf.</Badge>
                  <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                    {doneCount}/{allCount} kész
                  </Badge>
                </div>
                <h2 className="text-2xl font-extrabold mb-3">{activeTask.task_title}</h2>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Napi cél</span>
                      <span>{totalAwarded} / {activeSub.daily_goal_points} pont</span>
                    </div>
                    <Progress value={goalPct} className={meetsDaily ? "[&>div]:bg-emerald-500" : ""} />
                  </div>
                </div>
                {meetsDaily && (
                  <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Napi célt teljesítetted! 🔥
                  </div>
                )}
              </Card>

              {/* Subtasks list */}
              <div className="space-y-3">
                {activeTask.subtasks.map((st, idx) => {
                  const isOpen = openSubtaskId === st.id;
                  const done = !!st.completed_at;
                  const pct = done && st.max_points ? Math.round(((st.awarded_points || 0) / st.max_points) * 100) : 0;
                  return (
                    <Card key={st.id} className={`overflow-hidden ${done ? "border-emerald-500/30" : ""}`}>
                      <button
                        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
                        onClick={() => setOpenSubtaskId(isOpen ? null : st.id)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          done ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"
                        }`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{st.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{st.task_type}</Badge>
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> {st.est_minutes} perc
                            </span>
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                              <Zap className="w-3 h-3" /> {st.max_points} pont
                            </span>
                            {done && (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                +{st.awarded_points} ({pct}%)
                              </span>
                            )}
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-border">
                              {!done && (
                                <div className="flex justify-end mb-2">
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => regenerateSubtask(st)}
                                    disabled={regenId === st.id}
                                    className="gap-1 text-xs h-7"
                                  >
                                    {regenId === st.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <RefreshCw className="w-3 h-3" />}
                                    Másik feladatot kérek
                                  </Button>
                                </div>
                              )}

                              <ChallengeTaskRenderer
                                taskType={st.task_type}
                                data={st.data}
                                maxPoints={st.max_points}
                                done={done}
                                savedResult={done ? {
                                  awarded_points: st.awarded_points || 0,
                                  feedback_markdown: st.feedback || "",
                                  submission_summary: st.submission || "",
                                } : null}
                                writingDraft={submissionDraft[st.id] || ""}
                                setWritingDraft={(s) => setSubmissionDraft((d) => ({ ...d, [st.id]: s }))}
                                onSubmitWriting={() => submitWriting(st)}
                                submittingWriting={submittingId === st.id}
                                onSubmitInteractive={(r) => submitInteractive(st, r)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            </>
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
              Minden nap <strong>több rövid, változatos</strong> kreatív mini-feladat — saját napi és összesített pontcéllal.
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
            <p className="text-muted-foreground mb-6">Indíts egyet és minden nap új kreatív mini-feladatok várnak!</p>
            <Button onClick={() => setOpen(true)} size="lg" className="gradient-hero text-white gap-2">
              <Sparkles className="w-4 h-4" /> Feliratkozás
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subs.map((sub) => {
              const st = subStats(sub);
              const todayEarned = (st.todayTask?.subtasks || []).reduce((s, x) => s + (x.awarded_points || 0), 0);
              const todayDone = (st.todayTask?.subtasks || []).filter((x) => x.completed_at).length;
              const todayAll = (st.todayTask?.subtasks || []).length;
              const todayComplete = !!st.todayTask?.completed_at;
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
                          {st.streak > 0 && (
                            <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-0 gap-1">
                              <Flame className="w-3 h-3" /> {st.streak} napos sorozat
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mb-4">
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{sub.start_date} → {sub.end_date}</span>
                          <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" />Napi: {sub.daily_goal_points}p</span>
                          <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />Havi: {sub.total_goal_points}p</span>
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
                        ) : todayComplete ? (
                          <Button onClick={() => openTask(sub)} variant="outline" className="gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Mai kész ({todayEarned}p)
                          </Button>
                        ) : st.todayTask ? (
                          <Button onClick={() => openTask(sub)} className="gradient-hero text-white gap-2">
                            <Sparkles className="w-4 h-4" /> Folytatás ({todayDone}/{todayAll})
                          </Button>
                        ) : (
                          <Button onClick={() => openTask(sub)} className="gradient-hero text-white gap-2">
                            <Sparkles className="w-4 h-4" /> Mai feladatok
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => cancelSub(sub.id)} className="text-muted-foreground hover:text-destructive gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Lemondás
                        </Button>
                      </div>
                    </div>

                    {st.subTasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Utolsó napok</p>
                        <div className="flex flex-wrap gap-1.5">
                          {st.subTasks.slice(0, 14).map((t) => {
                            const earned = (t.subtasks || []).reduce((s, x) => s + (x.awarded_points || 0), 0);
                            const maxDone = (t.subtasks || []).reduce((s, x) => s + (x.completed_at ? x.max_points : 0), 0);
                            const pct = maxDone ? Math.round((earned / maxDone) * 100) : null;
                            const goalMet = earned >= sub.daily_goal_points;
                            return (
                              <div key={t.id} title={`${t.task_date}: ${earned}p${pct != null ? ` (${pct}%)` : ""}`}
                                className={`min-w-[48px] h-9 px-2 rounded text-[11px] font-bold flex items-center justify-center ${
                                  pct == null ? "bg-muted text-muted-foreground"
                                  : goalMet ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : pct >= 50 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                }`}>
                                {earned}p
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
                <p className="text-[11px] text-muted-foreground mt-1">A napi mini-feladatokból összesen.</p>
              </div>
              <div>
                <Label>Havi pontcél</Label>
                <Input type="number" min={100} max={5000} value={totalGoal} onChange={(e) => setTotalGoal(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">30 nap alatt összesen.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minden nap <strong>6 változatos feladat</strong>: 1 írásos, 1 feleletválasztós, 1 párosítós + 3 kreatív interaktív (csoportosítás, sorrend, igaz/hamis, szókitöltés, többszörös választás).
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
