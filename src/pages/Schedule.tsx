import { useEffect, useMemo, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Table2,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DAYS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const EVENT_TYPES = [
  { value: "school", label: "Iskolai esemény" },
  { value: "trip", label: "Kirándulás" },
  { value: "meeting", label: "Szülői / megbeszélés" },
  { value: "holiday", label: "Szünet / tanítás nélküli nap" },
  { value: "other", label: "Egyéb" },
];

type Timetable = {
  id: string;
  day_of_week: number;
  period: number;
  subject: string;
  room: string | null;
  teacher: string | null;
};
type Event = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  event_type: string;
  event_date: string;
  start_time: string | null;
};
type Plan = {
  id: string;
  plan_date: string;
  title: string;
  subject: string | null;
  what_to_study: string | null;
  minutes: number | null;
  ref_type: string | null;
  done: boolean;
};
type Homework = { id: string; subject: string; title: string; deadline: string | null };
type Exam = { id: string; subject: string; title: string; exam_type: string; exam_date: string | null };

const iso = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const todayIso = () => iso(new Date());
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" });

const Schedule = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(todayIso());

  const [ttOpen, setTtOpen] = useState(false);
  const [ttForm, setTtForm] = useState({ day_of_week: "1", period: "1", subject: "", room: "", teacher: "" });

  const [evOpen, setEvOpen] = useState(false);
  const [evForm, setEvForm] = useState({
    title: "",
    description: "",
    subject: "",
    event_type: "school",
    event_date: todayIso(),
    start_time: "",
  });

  const [planNote, setPlanNote] = useState("");
  const [planning, setPlanning] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [tt, ev, pl, hw, ex] = await Promise.all([
      supabase.from("timetable_entries").select("*").order("day_of_week").order("period"),
      supabase.from("calendar_events").select("*").order("event_date"),
      supabase.from("study_plans").select("*").order("plan_date"),
      supabase.from("homeworks").select("id, subject, title, deadline"),
      supabase.from("exams").select("id, subject, title, exam_type, exam_date"),
    ]);
    setTimetable((tt.data as Timetable[]) || []);
    setEvents((ev.data as Event[]) || []);
    setPlans((pl.data as Plan[]) || []);
    setHomeworks((hw.data as Homework[]) || []);
    setExams((ex.data as Exam[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---------------- órarend ---------------- */
  const addTimetable = async () => {
    if (!user || !ttForm.subject.trim()) return;
    const { error } = await supabase.from("timetable_entries").insert({
      user_id: user.id,
      day_of_week: Number(ttForm.day_of_week),
      period: Number(ttForm.period),
      subject: ttForm.subject.trim(),
      room: ttForm.room.trim() || null,
      teacher: ttForm.teacher.trim() || null,
    });
    if (error) return toast.error("Nem sikerült mentani az órát.");
    toast.success("Óra hozzáadva!");
    setTtForm({ ...ttForm, subject: "", room: "", teacher: "" });
    setTtOpen(false);
    load();
  };

  const deleteTimetable = async (id: string) => {
    await supabase.from("timetable_entries").delete().eq("id", id);
    setTimetable((p) => p.filter((t) => t.id !== id));
  };

  /* ---------------- naptár ---------------- */
  const addEvent = async () => {
    if (!user || !evForm.title.trim()) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: evForm.title.trim(),
      description: evForm.description.trim() || null,
      subject: evForm.subject.trim() || null,
      event_type: evForm.event_type,
      event_date: evForm.event_date,
      start_time: evForm.start_time || null,
    });
    if (error) return toast.error("Nem sikerült mentani az eseményt.");
    toast.success("Esemény felírva!");
    setEvForm({ ...evForm, title: "", description: "", subject: "", start_time: "" });
    setEvOpen(false);
    load();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents((p) => p.filter((e) => e.id !== id));
  };

  /* ---------------- AI terv ---------------- */
  const generatePlan = async () => {
    setPlanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-planner", {
        body: { note: planNote },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Kész! ${(data as any)?.count ?? 0} tanulási blokk ütemezve.`);
      if ((data as any)?.summary) toast.message((data as any).summary);
      load();
    } catch (e: any) {
      toast.error(e.message || "Nem sikerült tervet készíteni.");
    } finally {
      setPlanning(false);
    }
  };

  const togglePlan = async (p: Plan) => {
    await supabase.from("study_plans").update({ done: !p.done }).eq("id", p.id);
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)));
  };

  /* ---------------- naptár adatok ---------------- */
  const byDay = useMemo(() => {
    const map = new Map<string, { kind: string; label: string; color: string }[]>();
    const push = (date: string | null, item: { kind: string; label: string; color: string }) => {
      if (!date) return;
      const list = map.get(date) || [];
      list.push(item);
      map.set(date, list);
    };
    homeworks.forEach((h) =>
      push(h.deadline, { kind: "hw", label: `${h.subject}: ${h.title}`, color: "bg-chart-2" })
    );
    exams.forEach((e) =>
      push(e.exam_date, { kind: "exam", label: `${e.subject}: ${e.title}`, color: "bg-destructive" })
    );
    events.forEach((e) => push(e.event_date, { kind: "event", label: e.title, color: "bg-chart-4" }));
    plans.forEach((p) =>
      push(p.plan_date, { kind: "plan", label: p.title, color: p.done ? "bg-muted-foreground" : "bg-primary" })
    );
    return map;
  }, [homeworks, exams, events, plans]);

  const monthCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // hétfő-kezdés
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(iso(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const selectedHw = homeworks.filter((h) => h.deadline === selectedDay);
  const selectedExams = exams.filter((e) => e.exam_date === selectedDay);
  const selectedEvents = events.filter((e) => e.event_date === selectedDay);
  const selectedPlans = plans.filter((p) => p.plan_date === selectedDay);

  const upcomingPlans = useMemo(
    () => plans.filter((p) => p.plan_date >= todayIso()).sort((a, b) => a.plan_date.localeCompare(b.plan_date)),
    [plans]
  );
  const plansByDate = useMemo(() => {
    const m = new Map<string, Plan[]>();
    upcomingPlans.forEach((p) => m.set(p.plan_date, [...(m.get(p.plan_date) || []), p]));
    return [...m.entries()];
  }, [upcomingPlans]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-6xl">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" /> Órarend &amp; Naptár
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Az órarended, eseményeid és tanulási terved – csak te látod őket.
          </p>
        </div>

        <Tabs defaultValue="timetable">
          <TabsList className="w-full grid grid-cols-3 rounded-xl mb-4">
            <TabsTrigger value="timetable" className="gap-1.5 text-xs sm:text-sm">
              <Table2 className="w-4 h-4" /> Órarend
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-4 h-4" /> Naptár
            </TabsTrigger>
            <TabsTrigger value="planner" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4" /> AI tervező
            </TabsTrigger>
          </TabsList>

          {/* ---------- ÓRAREND ---------- */}
          <TabsContent value="timetable">
            <div className="flex justify-end mb-3">
              <Dialog open={ttOpen} onOpenChange={setTtOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl gap-1.5">
                    <Plus className="w-4 h-4" /> Óra hozzáadása
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Új óra az órarendbe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nap</Label>
                        <Select
                          value={ttForm.day_of_week}
                          onValueChange={(v) => setTtForm({ ...ttForm, day_of_week: v })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d, i) => (
                              <SelectItem key={d} value={String(i + 1)}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Hányadik óra</Label>
                        <Select value={ttForm.period} onValueChange={(v) => setTtForm({ ...ttForm, period: v })}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERIODS.map((p) => (
                              <SelectItem key={p} value={String(p)}>
                                {p}. óra
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Tantárgy</Label>
                      <Input
                        className="rounded-xl"
                        value={ttForm.subject}
                        onChange={(e) => setTtForm({ ...ttForm, subject: e.target.value })}
                        placeholder="pl. Matematika"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Terem</Label>
                        <Input
                          className="rounded-xl"
                          value={ttForm.room}
                          onChange={(e) => setTtForm({ ...ttForm, room: e.target.value })}
                          placeholder="pl. 12."
                        />
                      </div>
                      <div>
                        <Label>Tanár</Label>
                        <Input
                          className="rounded-xl"
                          value={ttForm.teacher}
                          onChange={(e) => setTtForm({ ...ttForm, teacher: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button onClick={addTimetable} className="w-full rounded-xl">
                      Mentés
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : timetable.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="py-14 text-center">
                  <div className="text-5xl mb-3">🗓️</div>
                  <p className="font-bold">Még nincs órarended</p>
                  <p className="text-sm text-muted-foreground">Add meg az óráidat, és az AI ezt is figyelembe veszi.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {DAYS.map((day, i) => {
                  const lessons = timetable
                    .filter((t) => t.day_of_week === i + 1)
                    .sort((a, b) => a.period - b.period);
                  return (
                    <Card key={day} className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">{day}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-4">
                        {lessons.length === 0 && <p className="text-xs text-muted-foreground">Nincs óra</p>}
                        {lessons.map((l) => (
                          <div
                            key={l.id}
                            className="group rounded-xl bg-muted/60 px-2.5 py-2 text-xs flex items-start gap-1"
                          >
                            <span className="font-bold text-primary shrink-0">{l.period}.</span>
                            <span className="flex-1 min-w-0 break-words">
                              <span className="font-semibold block">{l.subject}</span>
                              {(l.room || l.teacher) && (
                                <span className="text-muted-foreground">
                                  {[l.room, l.teacher].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => deleteTimetable(l.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                              aria-label="Óra törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ---------- NAPTÁR ---------- */}
          <TabsContent value="calendar">
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-base font-bold">
                    {month.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-bold text-muted-foreground">
                    {["H", "Sz", "Sze", "Cs", "P", "Szo", "V"].map((d, i) => (
                      <div key={i}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthCells.map((date, i) => {
                      if (!date) return <div key={`e${i}`} />;
                      const items = byDay.get(date) || [];
                      const isToday = date === todayIso();
                      const isSel = date === selectedDay;
                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedDay(date)}
                          className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-start text-xs transition
                            ${isSel ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                            ${isToday && !isSel ? "ring-2 ring-primary/50" : ""}`}
                        >
                          <span className="font-semibold">{Number(date.slice(8))}</span>
                          <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                            {items.slice(0, 4).map((it, k) => (
                              <span key={k} className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-primary-foreground" : it.color}`} />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-2" /> Házi határidő</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Dolgozat</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-4" /> Esemény</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Tanulási blokk</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Dialog open={evOpen} onOpenChange={setEvOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full rounded-xl gap-1.5"
                      onClick={() => setEvForm({ ...evForm, event_date: selectedDay })}
                    >
                      <Plus className="w-4 h-4" /> Iskolai esemény felírása
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Új esemény</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Megnevezés</Label>
                        <Input
                          className="rounded-xl"
                          value={evForm.title}
                          onChange={(e) => setEvForm({ ...evForm, title: e.target.value })}
                          placeholder="pl. Osztálykirándulás"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Típus</Label>
                          <Select value={evForm.event_type} onValueChange={(v) => setEvForm({ ...evForm, event_type: v })}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EVENT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Dátum</Label>
                          <Input
                            type="date"
                            className="rounded-xl"
                            value={evForm.event_date}
                            onChange={(e) => setEvForm({ ...evForm, event_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Tantárgy (opcionális)</Label>
                          <Input
                            className="rounded-xl"
                            value={evForm.subject}
                            onChange={(e) => setEvForm({ ...evForm, subject: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Időpont (opcionális)</Label>
                          <Input
                            type="time"
                            className="rounded-xl"
                            value={evForm.start_time}
                            onChange={(e) => setEvForm({ ...evForm, start_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Részletek</Label>
                        <Textarea
                          className="rounded-xl"
                          rows={3}
                          value={evForm.description}
                          onChange={(e) => setEvForm({ ...evForm, description: e.target.value })}
                        />
                      </div>
                      <Button onClick={addEvent} className="w-full rounded-xl">
                        Mentés
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Card className="rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold capitalize">{fmtDay(selectedDay)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    {selectedHw.length + selectedExams.length + selectedEvents.length + selectedPlans.length === 0 && (
                      <p className="text-sm text-muted-foreground">Erre a napra nincs bejegyzés.</p>
                    )}
                    {selectedExams.map((e) => (
                      <div key={e.id} className="rounded-xl border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
                        <Badge variant="destructive" className="text-[10px] mb-1">Dolgozat</Badge>
                        <p className="font-semibold break-words">{e.subject}: {e.title}</p>
                      </div>
                    ))}
                    {selectedHw.map((h) => (
                      <div key={h.id} className="rounded-xl border border-border bg-muted/40 p-2.5 text-sm">
                        <Badge variant="secondary" className="text-[10px] mb-1">Házi határidő</Badge>
                        <p className="font-semibold break-words">{h.subject}: {h.title}</p>
                      </div>
                    ))}
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="rounded-xl border border-border p-2.5 text-sm group">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <Badge className="text-[10px] mb-1">
                              {EVENT_TYPES.find((t) => t.value === e.event_type)?.label || "Esemény"}
                            </Badge>
                            <p className="font-semibold break-words">{e.title}</p>
                            {e.start_time && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {e.start_time.slice(0, 5)}
                              </p>
                            )}
                            {e.description && <p className="text-xs text-muted-foreground break-words">{e.description}</p>}
                          </div>
                          <button
                            onClick={() => deleteEvent(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                            aria-label="Esemény törlése"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedPlans.map((p) => (
                      <div key={p.id} className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-sm">
                        <Badge variant="outline" className="text-[10px] mb-1">Tanulás {p.minutes ? `· ${p.minutes} perc` : ""}</Badge>
                        <p className={`font-semibold break-words ${p.done ? "line-through opacity-60" : ""}`}>{p.title}</p>
                        {p.what_to_study && <p className="text-xs text-muted-foreground break-words">{p.what_to_study}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ---------- AI TERVEZŐ ---------- */}
          <TabsContent value="planner">
            <Card className="rounded-2xl mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Az AI megnézi a felírt házi feladataidat, dolgozataidat és az órarendedet, majd beütemezi,
                    <strong className="text-foreground"> melyik napon mit és mennyit</strong> érdemes tanulnod.
                  </div>
                </div>
                <Textarea
                  className="rounded-xl"
                  rows={2}
                  placeholder="Extra kérés (opcionális): pl. szerdán edzésem van, akkor ne tervezz."
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                />
                <Button onClick={generatePlan} disabled={planning} className="rounded-xl gap-1.5 w-full sm:w-auto">
                  {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {planning ? "Tervezés..." : "Tanulási terv készítése"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Az új terv felülírja a még el nem végzett, jövőbeli blokkokat.
                </p>
              </CardContent>
            </Card>

            {plansByDate.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="py-14 text-center">
                  <div className="text-5xl mb-3">🧠</div>
                  <p className="font-bold">Még nincs tanulási terved</p>
                  <p className="text-sm text-muted-foreground">
                    Írj fel házi feladatot vagy dolgozatot, majd kérd meg az AI-t, hogy ütemezze be.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {plansByDate.map(([date, items], idx) => (
                  <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold capitalize flex items-center gap-2">
                          {fmtDay(date)}
                          {date === todayIso() && <Badge className="text-[10px]">Ma</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-4">
                        {items.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-xl border border-border p-3 flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                {p.subject && <Badge variant="secondary" className="text-[10px]">{p.subject}</Badge>}
                                {p.ref_type === "exam" && <Badge variant="destructive" className="text-[10px]">Dolgozatra</Badge>}
                                {p.ref_type === "homework" && <Badge variant="outline" className="text-[10px]">Házi</Badge>}
                                {p.minutes && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {p.minutes} perc
                                  </span>
                                )}
                              </div>
                              <p className={`font-semibold text-sm break-words ${p.done ? "line-through opacity-60" : ""}`}>
                                {p.title}
                              </p>
                              {p.what_to_study && (
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{p.what_to_study}</p>
                              )}
                            </div>
                            <Button
                              variant={p.done ? "ghost" : "secondary"}
                              size="sm"
                              className="rounded-xl shrink-0 gap-1"
                              onClick={() => togglePlan(p)}
                            >
                              {p.done ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">{p.done ? "Visszaállít" : "Kész"}</span>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Schedule;
