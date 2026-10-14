import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Heart, Loader2, Lock, Check, Star, Trash2, Upload, X, ArrowLeft, Sparkles } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import RichMarkdown from "@/components/RichMarkdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkAnswer, type Exercise } from "@/lib/learningPath";

type Lesson = { id: string; title: string; teach: string; exercises: Exercise[] };
type Unit = { title: string; lessons: Lesson[] };
type Path = { id: string; title: string; subject: string | null; grade: number | null; units: Unit[]; completed: string[]; xp: number };

const LearningPath = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [paths, setPaths] = useState<Path[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topic: "", subject: "", grade: "8", difficulty: "medium", material: "" });
  const [active, setActive] = useState<{ path: Path; lesson: Lesson } | null>(null);

  const openId = params.get("id");
  const open = paths.find((p) => p.id === openId) ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("learning_paths").select("*").order("created_at", { ascending: false });
    setPaths((data ?? []) as unknown as Path[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

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
    const { data, error } = await supabase.functions.invoke("learning-path", {
      body: { ...form, grade: Number(form.grade) },
    });
    setCreating(false);
    if (error || data?.error) {
      toast({ title: "Hiba", description: data?.error ?? "Nem sikerült létrehozni.", variant: "destructive" });
      return;
    }
    await load();
    setParams({ id: data.id });
  };

  const remove = async (id: string) => {
    await supabase.from("learning_paths").delete().eq("id", id);
    setParams({});
    load();
  };

  const finishLesson = async (path: Path, lesson: Lesson, xp: number) => {
    const completed = Array.from(new Set([...(path.completed ?? []), lesson.id]));
    await supabase.from("learning_paths").update({ completed, xp: (path.xp ?? 0) + xp, updated_at: new Date().toISOString() }).eq("id", path.id);
    // mark today's planner item for this path as done
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("study_plans").update({ done: true }).eq("ref_id", path.id).eq("plan_date", today);
    setActive(null);
    load();
  };

  if (active) return <LessonPlayer lesson={active.lesson} onExit={() => setActive(null)} onDone={(xp) => finishLesson(active.path, active.lesson, xp)} />;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {open ? (
          <PathMap path={open} onBack={() => setParams({})} onStart={(lesson) => setActive({ path: open, lesson })} onDelete={() => remove(open.id)} />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center"><Footprints className="w-6 h-6 text-primary" /></div>
              <div>
                <h1 className="text-2xl font-extrabold">Lépésről lépésre</h1>
                <p className="text-sm text-muted-foreground">Válassz témát vagy tölts fel anyagot – az AI rövid leckékben tanít és gyakoroltat.</p>
              </div>
            </div>

            <Card className="p-5 rounded-3xl space-y-4 mb-8">
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
              <Button onClick={create} disabled={creating || (form.topic.trim().length < 2 && form.material.trim().length < 30)} className="w-full rounded-full">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Ösvény készítése…</> : <><Sparkles className="w-4 h-4 mr-2" />Ösvény létrehozása</>}
              </Button>
            </Card>

            <h2 className="font-bold mb-3">Ösvényeim</h2>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : paths.length === 0 ? (
              <Card className="p-8 rounded-3xl text-center text-muted-foreground">
                <Footprints className="w-10 h-10 mx-auto mb-2 opacity-50" />Még nincs tanulási ösvényed. Hozd létre az elsőt fent!
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {paths.map((p) => {
                  const total = p.units.reduce((n, u) => n + u.lessons.length, 0);
                  const pct = total ? Math.round(((p.completed?.length ?? 0) / total) * 100) : 0;
                  return (
                    <Card key={p.id} className="p-4 rounded-2xl cursor-pointer hover:border-primary transition" onClick={() => setParams({ id: p.id })}>
                      <div className="font-bold">{p.title}</div>
                      <div className="text-xs text-muted-foreground mb-2">{p.subject ?? "—"} · {p.completed?.length ?? 0}/{total} lecke · {p.xp} XP</div>
                      <Progress value={pct} />
                    </Card>
                  );
                })}
              </div>
            )}
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
