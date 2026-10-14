import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Heart, Loader2, Lock, Check, Star, Trash2, Upload, X, ArrowLeft, Sparkles, Globe, LockKeyhole, Share2, Search, Flame, Trophy, Users, Plus } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import RichMarkdown from "@/components/RichMarkdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkAnswer, type Exercise } from "@/lib/learningPath";

type Lesson = { id: string; title: string; teach: string; exercises: Exercise[] };
type Unit = { title: string; lessons: Lesson[] };
type Path = {
  id: string; user_id: string; title: string; subject: string | null; grade: number | null; units: Unit[];
  completed: string[]; xp: number; is_public: boolean; plays: number; author?: string;
};

const GRADIENTS = ["from-primary to-secondary", "from-secondary to-accent", "from-accent to-primary", "from-primary/80 to-accent/80"];
const lessonCount = (p: Path) => p.units.reduce((n, u) => n + u.lessons.length, 0);

const LearningPath = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [paths, setPaths] = useState<Path[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"mine" | "explore">("mine");
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [form, setForm] = useState({ topic: "", subject: "", grade: "8", difficulty: "medium", material: "", is_public: false });
  const [active, setActive] = useState<{ path: Path; lesson: Lesson } | null>(null);

  const openId = params.get("id");
  const open = paths.find((p) => p.id === openId) ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data }, { data: prog }] = await Promise.all([
      supabase.from("learning_paths").select("*").order("created_at", { ascending: false }),
      supabase.from("learning_path_progress").select("path_id, completed, xp").eq("user_id", user.id),
    ]);
    const rows = (data ?? []) as unknown as Path[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, display_name, username").in("id", ids) : { data: [] };
    const names = new Map((profs ?? []).map((p) => [p.id, p.display_name || p.username]));
    const progMap = new Map((prog ?? []).map((p) => [p.path_id, p]));
    setPaths(rows.map((r) => {
      const own = r.user_id === user.id;
      const pr = progMap.get(r.id);
      return { ...r, author: names.get(r.user_id) ?? "Ismeretlen", completed: own ? r.completed : ((pr?.completed as string[]) ?? []), xp: own ? r.xp : (pr?.xp ?? 0) };
    }));
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const mine = paths.filter((p) => p.user_id === user?.id || (p.completed?.length ?? 0) > 0);
  const publicPaths = paths.filter((p) => p.is_public);
  const subjects = Array.from(new Set(publicPaths.map((p) => p.subject).filter(Boolean))) as string[];
  const list = (tab === "mine" ? mine : publicPaths).filter((p) =>
    (subjectFilter === "all" || p.subject === subjectFilter) && p.title.toLowerCase().includes(q.toLowerCase()));
  const totalXp = mine.reduce((n, p) => n + (p.xp ?? 0), 0);
  const totalDone = mine.reduce((n, p) => n + (p.completed?.length ?? 0), 0);
  const continuePath = mine.find((p) => (p.completed?.length ?? 0) < lessonCount(p));

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name) && !f.type.startsWith("text/")) {
      toast({ title: "Csak szöveges fájl (.txt, .md)", description: "PDF-hez másold be a szöveget." });
      return;
    }
    const text = await f.text();
    setForm((s) => ({ ...s, material: text.slice(0, 15000), topic: s.topic || f.name.replace(/\.[^.]+$/, "") }));
  };

  const create = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("learning-path", { body: { ...form, grade: Number(form.grade) } });
    setCreating(false);
    if (error || data?.error) {
      toast({ title: "Hiba", description: data?.error ?? "Nem sikerült létrehozni.", variant: "destructive" });
      return;
    }
    if (form.is_public) await supabase.from("learning_paths").update({ is_public: true }).eq("id", data.id);
    setShowCreate(false);
    await load();
    setParams({ id: data.id });
  };

  const remove = async (id: string) => {
    await supabase.from("learning_paths").delete().eq("id", id);
    setParams({});
    load();
  };

  const togglePublic = async (p: Path) => {
    await supabase.from("learning_paths").update({ is_public: !p.is_public }).eq("id", p.id);
    toast({ title: p.is_public ? "Most már privát" : "Publikus lett – mások is gyakorolhatják!" });
    load();
  };

  const finishLesson = async (path: Path, lesson: Lesson, xp: number) => {
    if (!user) return;
    const completed = Array.from(new Set([...(path.completed ?? []), lesson.id]));
    const newXp = (path.xp ?? 0) + xp;
    if (path.user_id === user.id) {
      await supabase.from("learning_paths").update({ completed, xp: newXp, updated_at: new Date().toISOString() }).eq("id", path.id);
    } else {
      if (!path.completed?.length) await supabase.rpc("bump_path_plays", { _path_id: path.id });
      await supabase.from("learning_path_progress").upsert(
        { user_id: user.id, path_id: path.id, completed, xp: newXp, updated_at: new Date().toISOString() },
        { onConflict: "user_id,path_id" });
    }
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("study_plans").update({ done: true }).eq("ref_id", path.id).eq("plan_date", today);
    setActive(null);
    load();
  };

  if (active) return <LessonPlayer lesson={active.lesson} onExit={() => setActive(null)} onDone={(xp) => finishLesson(active.path, active.lesson, xp)} />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {open ? (
          <div className="max-w-3xl mx-auto">
            <PathMap path={open} isOwner={open.user_id === user?.id} onBack={() => setParams({})}
              onStart={(lesson) => setActive({ path: open, lesson })} onDelete={() => remove(open.id)} onTogglePublic={() => togglePublic(open)} />
          </div>
        ) : (
          <>
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-secondary to-accent p-6 sm:p-8 text-primary-foreground mb-6">
              <motion.div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-primary-foreground/10" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 6, repeat: Infinity }} />
              <motion.div className="absolute right-24 bottom-[-3rem] w-32 h-32 rounded-full bg-primary-foreground/10" animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity }} />
              <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold opacity-90"><Footprints className="w-4 h-4" />Lépésről lépésre</div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Tanulj kis lépésekben 🚀</h1>
                  <p className="opacity-90 mt-1 max-w-md">Rövid leckék, azonnali visszajelzés. Készíts sajátot, vagy gyakorolj a közösség ösvényein.</p>
                </div>
                <Button size="lg" variant="secondary" className="rounded-full font-bold shadow-lg" onClick={() => setShowCreate(true)}>
                  <Plus className="w-5 h-5 mr-1" />Új ösvény
                </Button>
              </div>
              <div className="relative grid grid-cols-3 gap-3 mt-6">
                {[
                  { icon: Trophy, label: "Összes XP", value: totalXp },
                  { icon: Flame, label: "Kész lecke", value: totalDone },
                  { icon: Footprints, label: "Ösvényeim", value: mine.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-primary-foreground/15 backdrop-blur p-3">
                    <s.icon className="w-5 h-5 mb-1" />
                    <div className="text-2xl font-extrabold">{s.value}</div>
                    <div className="text-xs opacity-90">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {continuePath && (
              <Card className="p-4 rounded-3xl mb-6 flex items-center gap-4 cursor-pointer hover:border-primary transition" onClick={() => setParams({ id: continuePath.id })}>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Star className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground font-bold">Folytasd, ahol abbahagytad</div>
                  <div className="font-bold truncate">{continuePath.title}</div>
                  <Progress value={(continuePath.completed.length / Math.max(1, lessonCount(continuePath))) * 100} className="h-2 mt-1" />
                </div>
                <Button className="rounded-full">Tovább</Button>
              </Card>
            )}

            {/* Tabs + filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
              <div className="inline-flex rounded-full bg-muted p-1">
                {([["mine", "Sajátjaim", Footprints], ["explore", "Felfedezés", Globe]] as const).map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition ${tab === k ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés…" className="pl-9 rounded-full" />
                </div>
                {tab === "explore" && subjects.length > 0 && (
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="w-36 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Minden tárgy</SelectItem>
                      {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : list.length === 0 ? (
              <Card className="p-10 rounded-3xl text-center text-muted-foreground">
                <Footprints className="w-12 h-12 mx-auto mb-3 opacity-40" />
                {tab === "mine" ? "Még nincs ösvényed. Hozz létre egyet, vagy nézz körül a Felfedezésben!" : "Még senki nem osztott meg ösvényt. Legyél te az első!"}
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((p, i) => {
                  const total = lessonCount(p);
                  const pct = total ? Math.round(((p.completed?.length ?? 0) / total) * 100) : 0;
                  const own = p.user_id === user?.id;
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }}>
                      <Card className="rounded-3xl overflow-hidden cursor-pointer h-full flex flex-col" onClick={() => setParams({ id: p.id })}>
                        <div className={`h-20 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} p-3 flex items-start justify-between text-primary-foreground`}>
                          <span className="text-xs font-bold bg-primary-foreground/20 rounded-full px-2 py-0.5">{p.subject ?? "Általános"}{p.grade ? ` · ${p.grade}.` : ""}</span>
                          {p.is_public ? <Globe className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />}
                        </div>
                        <div className="p-4 flex-1 flex flex-col gap-2">
                          <div className="font-extrabold leading-tight">{p.title}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                            <span>{p.units.length} egység · {total} lecke</span>
                            {p.is_public && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.plays}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{own ? <Badge variant="secondary" className="text-[10px]">Saját</Badge> : `by ${p.author}`}</div>
                          <div className="mt-auto pt-2">
                            <Progress value={pct} className="h-2" />
                            <div className="text-[11px] text-muted-foreground mt-1">{pct}% · {p.xp ?? 0} XP</div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader><DialogTitle>Új tanulási ösvény</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Téma</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="pl. Törtek összeadása" /></div>
                    <div><Label>Tantárgy</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="pl. Matematika" /></div>
                    <div>
                      <Label>Évfolyam</Label>
                      <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}. osztály</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nehézség</Label>
                      <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Könnyű</SelectItem>
                          <SelectItem value="medium">Közepes</SelectItem>
                          <SelectItem value="hard">Nehéz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Saját tananyag (opcionális)</Label>
                      <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Fájl feltöltése
                        <input type="file" accept=".txt,.md,.csv,text/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                      </label>
                    </div>
                    <Textarea rows={5} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value.slice(0, 15000) })} placeholder="Illeszd be a jegyzetet vagy a tankönyv szövegét…" />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
                    Publikus – mások is gyakorolhatják
                  </label>
                  <Button onClick={create} disabled={creating || (form.topic.trim().length < 2 && form.material.trim().length < 30)} className="w-full rounded-full">
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Ösvény készítése…</> : <><Sparkles className="w-4 h-4 mr-2" />Ösvény létrehozása</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

const PathMap = ({ path, isOwner, onBack, onStart, onDelete, onTogglePublic }: { path: Path; isOwner: boolean; onBack: () => void; onStart: (l: Lesson) => void; onDelete: () => void; onTogglePublic: () => void }) => {
  const order = path.units.flatMap((u) => u.lessons.map((l) => l.id));
  const done = new Set(path.completed ?? []);
  const nextId = order.find((id) => !done.has(id));
  let idx = 0;
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/path?id=${path.id}`);
    toast({ title: "Link másolva!" });
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Vissza</Button>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button variant={path.is_public ? "default" : "outline"} size="sm" className="rounded-full" onClick={onTogglePublic}>
              {path.is_public ? <><Globe className="w-4 h-4 mr-1" />Publikus</> : <><LockKeyhole className="w-4 h-4 mr-1" />Privát – megosztás</>}
            </Button>
          )}
          {path.is_public && <Button variant="ghost" size="icon" onClick={copyLink} aria-label="Link másolása"><Share2 className="w-4 h-4" /></Button>}
          {isOwner && <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Ösvény törlése"><Trash2 className="w-4 h-4" /></Button>}
        </div>
      </div>
      {!isOwner && path.author && <p className="text-center text-xs text-muted-foreground">Készítette: {path.author}</p>}
      <h1 className="text-2xl font-extrabold text-center">{path.title}</h1>
      <p className="text-center text-sm text-muted-foreground mb-8">{path.xp} XP · {done.size}/{order.length} lecke kész</p>
      {path.units.map((u, ui) => (
        <div key={ui} className="mb-10">
          <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 font-bold mb-6">{ui + 1}. egység · {u.title}</div>
          <div className="flex flex-col items-center gap-5">
            {u.lessons.map((l) => {
              const i = idx++;
              const isDone = done.has(l.id);
              const isNext = l.id === nextId;
              const locked = !isDone && !isNext;
              const offset = [0, 60, 90, 60, 0, -60, -90, -60][i % 8];
              return (
                <div key={l.id} style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center">
                  <motion.button
                    whileHover={!locked ? { scale: 1.08 } : undefined}
                    whileTap={!locked ? { scale: 0.95 } : undefined}
                    disabled={locked}
                    onClick={() => onStart(l)}
                    aria-label={l.title}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-b-8 transition ${
                      isDone ? "bg-accent border-accent-foreground/30 text-accent-foreground" :
                      isNext ? "bg-primary border-primary/60 text-primary-foreground ring-4 ring-primary/30 animate-pulse" :
                      "bg-muted border-border text-muted-foreground"}`}
                  >
                    {isDone ? <Check className="w-8 h-8" /> : locked ? <Lock className="w-7 h-7" /> : <Star className="w-8 h-8" />}
                  </motion.button>
                  <span className="text-xs mt-2 max-w-[140px] text-center font-semibold">{l.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const LessonPlayer = ({ lesson, onExit, onDone }: { lesson: Lesson; onExit: () => void; onDone: (xp: number) => void }) => {
  // step -1 = teach card, then exercises; wrong ones are re-queued at the end
  const [queue, setQueue] = useState<number[]>(() => lesson.exercises.map((_, i) => i));
  const [pos, setPos] = useState(-1);
  const [hearts, setHearts] = useState(5);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const [mistakes, setMistakes] = useState(0);
  const finished = pos >= queue.length;
  const ex = pos >= 0 && !finished ? lesson.exercises[queue[pos]] : null;
  const progress = useMemo(() => (Math.max(0, pos) / queue.length) * 100, [pos, queue.length]);

  const check = () => {
    if (!ex) return;
    const ok = checkAnswer(ex, input);
    setResult(ok);
    if (!ok) {
      setHearts((h) => h - 1);
      setMistakes((m) => m + 1);
      setQueue((q) => [...q, q[pos]]);
    }
  };
  const next = () => { setResult(null); setInput(""); setPos((p) => p + 1); };

  const xp = Math.max(5, 15 - mistakes * 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 pt-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Kilépés"><X className="w-5 h-5" /></Button>
        <Progress value={finished ? 100 : progress} className="h-3 flex-1" />
        <span className="flex items-center gap-1 font-bold text-destructive"><Heart className="w-5 h-5 fill-current" />{hearts}</span>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={`${pos}-${hearts <= 0}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            {hearts <= 0 ? (
              <div className="text-center space-y-4 pt-10">
                <div className="text-5xl">💔</div>
                <h2 className="text-2xl font-extrabold">Elfogytak a szíveid</h2>
                <p className="text-muted-foreground">Semmi baj! Nézd át újra a magyarázatot és próbáld meg még egyszer.</p>
                <Button className="rounded-full" onClick={() => { setHearts(5); setMistakes(0); setPos(-1); setQueue(lesson.exercises.map((_, i) => i)); }}>Újrakezdés</Button>
              </div>
            ) : finished ? (
              <div className="text-center space-y-4 pt-10">
                <div className="text-6xl">🎉</div>
                <h2 className="text-2xl font-extrabold">Lecke kész!</h2>
                <p className="text-muted-foreground">+{xp} XP · {mistakes} hiba</p>
                <Button className="rounded-full px-8" onClick={() => onDone(xp)}>Tovább</Button>
              </div>
            ) : pos === -1 ? (
              <div className="space-y-4">
                <div className="text-xs font-bold text-primary uppercase">Új anyag</div>
                <h2 className="text-2xl font-extrabold">{lesson.title}</h2>
                <Card className="p-5 rounded-3xl"><RichMarkdown content={lesson.teach} /></Card>
              </div>
            ) : ex && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-primary uppercase">
                  {ex.type === "mcq" ? "Válaszd ki a helyeset" : ex.type === "true_false" ? "Igaz vagy hamis?" : "Egészítsd ki"}
                </div>
                <h2 className="text-xl font-bold">{ex.prompt}</h2>
                {ex.type === "fill_blank" ? (
                  <Input autoFocus value={input} disabled={result !== null} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && input.trim() && result === null && check()} placeholder="Írd be a választ…" className="text-lg h-12" />
                ) : (
                  <div className="grid gap-3">
                    {(ex.type === "true_false" && !ex.options?.length ? ["Igaz", "Hamis"] : ex.options).map((o) => (
                      <button key={o} disabled={result !== null} onClick={() => setInput(o)}
                        className={`text-left rounded-2xl border-2 border-b-4 px-4 py-3 font-semibold transition ${input === o ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {hearts > 0 && !finished && (
        <div className={`border-t ${result === true ? "bg-accent" : result === false ? "bg-destructive/10" : "bg-background"}`}>
          <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="text-sm min-h-[1.25rem]">
              {result === true && <span className="font-bold">✅ Szuper! {ex?.explanation}</span>}
              {result === false && <span><b className="text-destructive">Helyes válasz: {ex?.answer}</b> — {ex?.explanation}</span>}
            </div>
            {pos === -1 ? <Button className="rounded-full px-8" onClick={next}>Kezdjük!</Button>
              : result === null ? <Button className="rounded-full px-8" disabled={!input.trim()} onClick={check}>Ellenőrzés</Button>
              : <Button className="rounded-full px-8" onClick={next}>Tovább</Button>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPath;
