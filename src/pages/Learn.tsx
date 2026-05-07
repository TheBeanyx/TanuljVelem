import { useEffect, useMemo, useState } from "react";
import {
  Brain, Sparkles, Loader2, ChevronLeft, ChevronRight, RotateCcw,
  NotebookPen, ClipboardList, ArrowLeft, Check, X, Plus, Search, Library, FileText, Trash2, Globe, Lock, GraduationCap, Layers,
} from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Flashcard = { front: string; back: string; emoji: string };
type Question = {
  question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
};

type View =
  | "hub"
  | "ai-input"
  | "cards"
  | "done"
  | "notes"
  | "practice"
  | "create-set"
  | "create-note"
  | "view-set"
  | "view-note";

type SetRow = {
  id: string; title: string; topic: string | null; owner_id: string;
  visibility: string; difficulty: string; length: string; grade: number | null;
};
type NoteRow = {
  id: string; title: string; markdown: string; topic: string | null; owner_id: string;
  visibility: string; difficulty: string; length: string; grade: number | null;
};

const DIFFICULTY = [
  { value: "easy", label: "Könnyű" },
  { value: "medium", label: "Közepes" },
  { value: "hard", label: "Nehéz" },
];
const LENGTH = [
  { value: "short", label: "Rövid" },
  { value: "medium", label: "Közepes" },
  { value: "long", label: "Hosszú" },
];

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

const Learn = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [view, setView] = useState<View>("hub");
  const [tab, setTab] = useState<"flashcards" | "notes">("flashcards");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const [sets, setSets] = useState<SetRow[]>([]);
  const [notesList, setNotesList] = useState<NoteRow[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // ===== AI flow state =====
  const [topic, setTopic] = useState("");
  const [aiSettings, setAiSettings] = useState({
    grade: "8",
    difficulty: "medium",
    length: "medium",
    visibility: "private",
  });
  const [loading, setLoading] = useState<null | "flashcards" | "notes" | "practice">(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [aiNotes, setAiNotes] = useState<{ title: string; markdown: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [practiceTitle, setPracticeTitle] = useState("");
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [showResults, setShowResults] = useState(false);
  const [savedSetId, setSavedSetId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  // ===== Create state =====
  const [form, setForm] = useState({
    title: "",
    topic: "",
    grade: "8",
    visibility: "private",
    length: "medium",
    difficulty: "medium",
    markdown: "",
  });
  const [draftCards, setDraftCards] = useState<Flashcard[]>([
    { front: "", back: "", emoji: "📘" },
  ]);
  const [saving, setSaving] = useState(false);

  // ===== View state =====
  const [activeSet, setActiveSet] = useState<SetRow | null>(null);
  const [activeSetCards, setActiveSetCards] = useState<Flashcard[]>([]);
  const [activeNote, setActiveNote] = useState<NoteRow | null>(null);

  const loadLists = async () => {
    setListLoading(true);
    const [{ data: s }, { data: n }] = await Promise.all([
      supabase.from("flashcard_sets").select("*").order("created_at", { ascending: false }),
      supabase.from("learn_notes").select("*").order("created_at", { ascending: false }),
    ]);
    setSets((s as SetRow[]) || []);
    setNotesList((n as NoteRow[]) || []);
    setListLoading(false);
  };

  useEffect(() => {
    if (view === "hub") loadLists();
  }, [view]);

  // ============ AI ============
  const callAI = async (mode: "flashcards" | "notes" | "practice") => {
    setLoading(mode);
    try {
      const context = cards.length
        ? cards.map((c) => `- ${c.front}: ${c.back}`).join("\n")
        : undefined;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learn-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode,
          topic,
          context,
          grade: parseInt(aiSettings.grade, 10),
          difficulty: aiSettings.difficulty,
          length: aiSettings.length,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Hiba történt");
      }
      const json = await resp.json();
      return json.data;
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(null);
    }
  };

  const generateCards = async () => {
    if (topic.trim().length < 3) {
      toast({ title: "Adj meg egy témát (min. 3 karakter)", variant: "destructive" });
      return;
    }
    const data = await callAI("flashcards");
    if (!data) return;
    const title = data.topic_title || topic;
    setTopicTitle(title);
    setCards(data.cards || []);
    setCardIdx(0); setFlipped(false);
    setView("cards");

    // Auto-save the generated set
    if (user && data.cards?.length) {
      const { data: setRow } = await supabase
        .from("flashcard_sets")
        .insert({
          owner_id: user.id,
          title,
          topic: topic.trim(),
          grade: parseInt(aiSettings.grade, 10),
          visibility: aiSettings.visibility,
          length: aiSettings.length,
          difficulty: aiSettings.difficulty,
          source: "ai",
        })
        .select()
        .single();
      if (setRow) {
        setSavedSetId(setRow.id);
        const items = data.cards.map((c: Flashcard, i: number) => ({
          set_id: setRow.id,
          front: c.front,
          back: c.back,
          emoji: c.emoji || "📘",
          sort_order: i,
        }));
        await supabase.from("flashcard_items").insert(items);
        toast({ title: "Flashcardok elmentve a könyvtáradba 🎉" });
      }
    }
  };

  const generateNotes = async () => {
    const data = await callAI("notes");
    if (!data) return;
    setAiNotes(data); setView("notes");

    if (user && data.markdown) {
      const { data: noteRow } = await supabase.from("learn_notes").insert({
        owner_id: user.id,
        title: data.title,
        markdown: data.markdown,
        topic: topic.trim(),
        grade: parseInt(aiSettings.grade, 10),
        visibility: aiSettings.visibility,
        length: aiSettings.length,
        difficulty: aiSettings.difficulty,
        source: "ai",
      }).select().single();
      if (noteRow) {
        setSavedNoteId(noteRow.id);
        toast({ title: "Jegyzet elmentve a könyvtáradba 📝" });
      }
    }
  };

  const generatePractice = async () => {
    const data = await callAI("practice");
    if (!data) return;
    setPracticeTitle(data.title);
    setQuestions(data.questions || []);
    setAnswers({}); setShowResults(false);
    setView("practice");
  };

  const resetAI = () => {
    setTopic(""); setCards([]); setCardIdx(0); setFlipped(false);
    setAiNotes(null); setQuestions([]); setAnswers({}); setShowResults(false);
    setSavedSetId(null); setSavedNoteId(null);
  };

  const score = questions.reduce((s, q, i) => (answers[i] === q.correct_answer ? s + 1 : s), 0);

  // ============ Save ============
  const resetForm = () => {
    setForm({ title: "", topic: "", grade: "8", visibility: "private", length: "medium", difficulty: "medium", markdown: "" });
    setDraftCards([{ front: "", back: "", emoji: "📘" }]);
  };

  const saveSet = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: "Adj címet a flashcard csomagnak", variant: "destructive" });
      return;
    }
    const valid = draftCards.filter((c) => c.front.trim() && c.back.trim());
    if (valid.length < 1) {
      toast({ title: "Legalább 1 kártya kell", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: setRow, error } = await supabase
      .from("flashcard_sets")
      .insert({
        owner_id: user.id,
        title: form.title.trim(),
        topic: form.topic.trim() || null,
        grade: parseInt(form.grade, 10),
        visibility: form.visibility,
        length: form.length,
        difficulty: form.difficulty,
        source: "manual",
      })
      .select()
      .single();
    if (error || !setRow) {
      setSaving(false);
      toast({ title: "Mentés sikertelen", description: error?.message, variant: "destructive" });
      return;
    }
    const items = valid.map((c, i) => ({
      set_id: setRow.id,
      front: c.front.trim(),
      back: c.back.trim(),
      emoji: c.emoji || "📘",
      sort_order: i,
    }));
    const { error: itemsErr } = await supabase.from("flashcard_items").insert(items);
    setSaving(false);
    if (itemsErr) {
      toast({ title: "Kártyák mentése sikertelen", description: itemsErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Flashcard csomag mentve! 🎉" });
    resetForm();
    setView("hub");
  };

  const saveNote = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.markdown.trim()) {
      toast({ title: "Cím és tartalom is szükséges", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("learn_notes").insert({
      owner_id: user.id,
      title: form.title.trim(),
      markdown: form.markdown,
      topic: form.topic.trim() || null,
      grade: parseInt(form.grade, 10),
      visibility: form.visibility,
      length: form.length,
      difficulty: form.difficulty,
      source: "manual",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Jegyzet mentve! 📝" });
    resetForm();
    setView("hub");
  };

  const openSet = async (s: SetRow) => {
    const { data } = await supabase
      .from("flashcard_items")
      .select("front, back, emoji, sort_order")
      .eq("set_id", s.id)
      .order("sort_order", { ascending: true });
    setActiveSet(s);
    setActiveSetCards((data as Flashcard[]) || []);
    setCardIdx(0); setFlipped(false);
    setView("view-set");
  };

  const openNote = (n: NoteRow) => {
    setActiveNote(n);
    setView("view-note");
  };

  const deleteSet = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("flashcard_sets").delete().eq("id", id);
    loadLists();
  };
  const deleteNote = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("learn_notes").delete().eq("id", id);
    loadLists();
  };

  const filteredSets = useMemo(() =>
    sets.filter((s) => {
      const q = !search.trim() ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.topic || "").toLowerCase().includes(search.toLowerCase());
      const g = filterGrade === "all" || String(s.grade) === filterGrade;
      return q && g;
    }), [sets, search, filterGrade]);

  const filteredNotes = useMemo(() =>
    notesList.filter((n) => {
      const q = !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.topic || "").toLowerCase().includes(search.toLowerCase());
      const g = filterGrade === "all" || String(n.grade) === filterGrade;
      return q && g;
    }), [notesList, search, filterGrade]);

  // Settings form (shared)
  const SettingsFields = (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs font-semibold">Évfolyam</Label>
        <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
          <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GRADES.map((g) => <SelectItem key={g} value={String(g)}>{g}. évfolyam</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-semibold">Láthatóság</Label>
        <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
          <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="private">🔒 Privát</SelectItem>
            <SelectItem value="public">🌍 Publikus</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-semibold">Hossz</Label>
        <Select value={form.length} onValueChange={(v) => setForm({ ...form, length: v })}>
          <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LENGTH.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-semibold">Nehézség</Label>
        <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
          <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIFFICULTY.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const VisibilityBadge = ({ v }: { v: string }) => (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
      {v === "public" ? <><Globe className="w-3 h-3" /> Publikus</> : <><Lock className="w-3 h-3" /> Privát</>}
    </span>
  );

  const labelOf = (arr: { value: string; label: string }[], v: string) =>
    arr.find((x) => x.value === v)?.label || v;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Tanulás</h1>
            <p className="text-sm text-muted-foreground">Flashcardok, jegyzetek és AI segítség egy helyen</p>
          </div>
        </div>

        {/* HUB */}
        {view === "hub" && (
          <div className="animate-fade-in space-y-6">
            {/* Quick actions */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Button onClick={() => { resetAI(); setView("ai-input"); }}
                className="rounded-2xl py-6 h-auto flex-col gap-2 gradient-primary text-primary-foreground">
                <Sparkles className="w-6 h-6" />
                <span className="font-bold text-sm">AI Generálás</span>
              </Button>
              <Link to="/ai-tutor">
                <Button className="w-full rounded-2xl py-6 h-auto flex-col gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Brain className="w-6 h-6" />
                  <span className="font-bold text-sm">AI Tanár</span>
                </Button>
              </Link>
              <Button onClick={() => { resetForm(); setView("create-set"); }}
                variant="outline" className="rounded-2xl py-6 h-auto flex-col gap-2 border-2 hover:border-primary/40">
                <Layers className="w-6 h-6 text-primary" />
                <span className="font-bold text-sm">Új flashcard</span>
              </Button>
              <Button onClick={() => { resetForm(); setView("create-note"); }}
                variant="outline" className="rounded-2xl py-6 h-auto flex-col gap-2 border-2 hover:border-chart-4/40">
                <NotebookPen className="w-6 h-6 text-chart-4" />
                <span className="font-bold text-sm">Új jegyzet</span>
              </Button>
              <Button onClick={loadLists}
                variant="outline" className="rounded-2xl py-6 h-auto flex-col gap-2 border-2">
                <Library className="w-6 h-6" />
                <span className="font-bold text-sm">Frissítés</span>
              </Button>
            </div>

            {/* Search & filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Keresés cím vagy téma alapján..."
                  className="pl-9 rounded-xl" />
              </div>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden évf.</SelectItem>
                  {GRADES.map((g) => <SelectItem key={g} value={String(g)}>{g}. évf.</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full rounded-xl">
                <TabsTrigger value="flashcards" className="rounded-lg">
                  <Layers className="w-4 h-4 mr-2" /> Flashcardok ({filteredSets.length})
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-lg">
                  <FileText className="w-4 h-4 mr-2" /> Jegyzetek ({filteredNotes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flashcards" className="mt-4">
                {listLoading ? (
                  <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : filteredSets.length === 0 ? (
                  <div className="text-center py-16 bg-card rounded-3xl border border-border">
                    <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold">Még nincs flashcard csomag</p>
                    <p className="text-sm text-muted-foreground">Hozz létre egyet, vagy generálj AI-jal!</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredSets.map((s) => (
                      <button key={s.id} onClick={() => openSet(s)}
                        className="text-left bg-card rounded-2xl border border-border p-4 hover:border-primary/40 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold flex-1">{s.title}</h3>
                          {s.owner_id === user?.id && (
                            <button onClick={(e) => { e.stopPropagation(); deleteSet(s.id); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {s.topic && <p className="text-xs text-muted-foreground mt-1">{s.topic}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <VisibilityBadge v={s.visibility} />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{labelOf(DIFFICULTY, s.difficulty)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{labelOf(LENGTH, s.length)}</span>
                          {s.grade && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />{s.grade}. évf.</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                {listLoading ? (
                  <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-16 bg-card rounded-3xl border border-border">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold">Még nincs jegyzet</p>
                    <p className="text-sm text-muted-foreground">Hozz létre egyet a fenti gombbal!</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredNotes.map((n) => (
                      <button key={n.id} onClick={() => openNote(n)}
                        className="text-left bg-card rounded-2xl border border-border p-4 hover:border-chart-4/40 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold flex-1">{n.title}</h3>
                          {n.owner_id === user?.id && (
                            <button onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {n.topic && <p className="text-xs text-muted-foreground mt-1">{n.topic}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <VisibilityBadge v={n.visibility} />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{labelOf(DIFFICULTY, n.difficulty)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{labelOf(LENGTH, n.length)}</span>
                          {n.grade && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />{n.grade}. évf.</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* CREATE FLASHCARD SET */}
        {view === "create-set" && (
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              <h2 className="font-black">Új flashcard csomag</h2>
              <div className="w-16" />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Cím</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="pl. Történelem 8. — Reformkor" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Téma (opcionális)</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="pl. Történelem" className="mt-1 rounded-xl" />
              </div>
              {SettingsFields}

              <div className="pt-2">
                <Label className="text-xs font-semibold">Kártyák</Label>
                <div className="space-y-2 mt-2">
                  {draftCards.map((c, i) => (
                    <div key={i} className="grid grid-cols-[3rem_1fr_1fr_auto] gap-2 items-start">
                      <Input value={c.emoji} onChange={(e) => {
                        const d = [...draftCards]; d[i].emoji = e.target.value; setDraftCards(d);
                      }} className="rounded-xl text-center" />
                      <Input placeholder="Fogalom" value={c.front} onChange={(e) => {
                        const d = [...draftCards]; d[i].front = e.target.value; setDraftCards(d);
                      }} className="rounded-xl" />
                      <Input placeholder="Magyarázat" value={c.back} onChange={(e) => {
                        const d = [...draftCards]; d[i].back = e.target.value; setDraftCards(d);
                      }} className="rounded-xl" />
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (draftCards.length === 1) return;
                        setDraftCards(draftCards.filter((_, idx) => idx !== i));
                      }}><X className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setDraftCards([...draftCards, { front: "", back: "", emoji: "📘" }])}
                  className="rounded-xl mt-2 gap-1"><Plus className="w-4 h-4" /> Új kártya</Button>
              </div>

              <Button onClick={saveSet} disabled={saving}
                className="w-full rounded-xl gradient-primary text-primary-foreground font-bold py-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mentés"}
              </Button>
            </div>
          </div>
        )}

        {/* CREATE NOTE */}
        {view === "create-note" && (
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              <h2 className="font-black">Új jegyzet</h2>
              <div className="w-16" />
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Cím</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Téma</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="mt-1 rounded-xl" />
              </div>
              {SettingsFields}
              <div>
                <Label className="text-xs font-semibold">Tartalom (Markdown támogatott)</Label>
                <Textarea value={form.markdown} onChange={(e) => setForm({ ...form, markdown: e.target.value })}
                  rows={12} className="mt-1 rounded-xl font-mono text-sm" placeholder="## Fejezetcím&#10;&#10;Bekezdés..." />
              </div>
              <Button onClick={saveNote} disabled={saving}
                className="w-full rounded-xl gradient-primary text-primary-foreground font-bold py-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mentés"}
              </Button>
            </div>
          </div>
        )}

        {/* VIEW SAVED SET */}
        {view === "view-set" && activeSet && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              <h2 className="font-bold text-lg text-center flex-1">{activeSet.title}</h2>
              <span className="text-sm font-semibold text-muted-foreground">
                {activeSetCards.length ? `${cardIdx + 1} / ${activeSetCards.length}` : ""}
              </span>
            </div>
            {activeSetCards.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-3xl border border-border">Üres csomag</div>
            ) : (
              <>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
                  <div className="h-full gradient-primary transition-all duration-500"
                    style={{ width: `${((cardIdx + 1) / activeSetCards.length) * 100}%` }} />
                </div>
                <div className="perspective-1200 cursor-pointer select-none" onClick={() => setFlipped((f) => !f)}>
                  <div className="relative preserve-3d transition-transform duration-700 ease-out"
                    style={{ height: "min(60vh, 420px)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                    <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-chart-4/10 border-2 border-primary/30 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                      <div className="text-7xl mb-6">{activeSetCards[cardIdx].emoji}</div>
                      <h3 className="text-2xl sm:text-3xl font-black mb-3">{activeSetCards[cardIdx].front}</h3>
                      <p className="text-xs text-muted-foreground mt-auto">Kattints a kártyára 🔄</p>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-chart-4/15 via-card to-primary/15 border-2 border-chart-4/40 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                      <p className="text-base sm:text-lg leading-relaxed">{activeSetCards[cardIdx].back}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setFlipped(false); setCardIdx(Math.max(0, cardIdx - 1)); }}
                    disabled={cardIdx === 0} className="rounded-xl gap-1">
                    <ChevronLeft className="w-4 h-4" /> Előző
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)} className="gap-1">
                    <RotateCcw className="w-4 h-4" /> Megfordít
                  </Button>
                  <Button onClick={() => { setFlipped(false); setCardIdx(Math.min(activeSetCards.length - 1, cardIdx + 1)); }}
                    disabled={cardIdx + 1 >= activeSetCards.length}
                    className="rounded-xl gap-1 gradient-primary text-primary-foreground">
                    Következő <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW SAVED NOTE */}
        {view === "view-note" && activeNote && (
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
            </div>
            <h2 className="text-2xl font-black mb-4">{activeNote.title}</h2>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown>{activeNote.markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* AI INPUT */}
        {view === "ai-input" && (
          <div className="bg-card rounded-3xl border border-border p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
            </div>
            <Label className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-chart-4" /> Miről szeretnél tanulni?
            </Label>
            <Input autoFocus value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") generateCards(); }}
              placeholder="pl. Fotoszintézis, Pitagorasz-tétel..."
              className="mt-2 rounded-xl text-base h-12" />

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div>
                <Label className="text-xs font-semibold">Évfolyam</Label>
                <Select value={aiSettings.grade} onValueChange={(v) => setAiSettings({ ...aiSettings, grade: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => <SelectItem key={g} value={String(g)}>{g}. évfolyam</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Nehézség</Label>
                <Select value={aiSettings.difficulty} onValueChange={(v) => setAiSettings({ ...aiSettings, difficulty: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Hossz</Label>
                <Select value={aiSettings.length} onValueChange={(v) => setAiSettings({ ...aiSettings, length: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LENGTH.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Láthatóság</Label>
                <Select value={aiSettings.visibility} onValueChange={(v) => setAiSettings({ ...aiSettings, visibility: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Privát</SelectItem>
                    <SelectItem value="public">🌍 Publikus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">Az AI a beállítások alapján készít flashcardokat, és automatikusan elmenti a könyvtáradba. Utána kérhetsz jegyzetet vagy gyakorlótesztet ugyanezekkel a beállításokkal.</p>
            <Button onClick={generateCards} disabled={loading !== null}
              className="w-full mt-5 rounded-xl gradient-primary text-primary-foreground font-bold text-base py-6 gap-2">
              {loading === "flashcards" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading === "flashcards" ? "Generálás..." : "Flashcardok készítése"}
            </Button>
          </div>
        )}

        {/* AI CARDS */}
        {view === "cards" && cards.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => { resetAI(); setView("hub"); }} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Hub
              </Button>
              <h2 className="font-bold text-lg text-center flex-1">{topicTitle}</h2>
              <span className="text-sm font-semibold text-muted-foreground">{cardIdx + 1} / {cards.length}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
              <div className="h-full gradient-primary transition-all duration-500"
                style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }} />
            </div>
            <div className="perspective-1200 cursor-pointer select-none" onClick={() => setFlipped((f) => !f)}>
              <div className="relative preserve-3d transition-transform duration-700 ease-out"
                style={{ height: "min(60vh, 420px)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-chart-4/10 border-2 border-primary/30 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-7xl mb-6">{cards[cardIdx].emoji}</div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-3">{cards[cardIdx].front}</h3>
                  <p className="text-xs text-muted-foreground mt-auto">Kattints a kártyára a megfordításhoz 🔄</p>
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-chart-4/15 via-card to-primary/15 border-2 border-chart-4/40 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-base sm:text-lg leading-relaxed">{cards[cardIdx].back}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-6">
              <Button variant="outline" onClick={() => { if (cardIdx > 0) { setFlipped(false); setTimeout(() => setCardIdx((i) => i - 1), 150); } }}
                disabled={cardIdx === 0} className="rounded-xl gap-1">
                <ChevronLeft className="w-4 h-4" /> Előző
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)} className="gap-1">
                <RotateCcw className="w-4 h-4" /> Megfordít
              </Button>
              <Button onClick={() => {
                if (cardIdx + 1 >= cards.length) setView("done");
                else { setFlipped(false); setTimeout(() => setCardIdx((i) => i + 1), 150); }
              }} className="rounded-xl gap-1 gradient-primary text-primary-foreground">
                {cardIdx + 1 >= cards.length ? "Kész" : "Következő"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* AI DONE */}
        {view === "done" && (
          <div className="bg-card rounded-3xl border border-border p-8 text-center animate-fade-in">
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-2xl font-black mb-1">Szuper, végignézted!</h2>
            <p className="text-muted-foreground mb-6">Mit szeretnél most csinálni?</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button onClick={generateNotes} disabled={loading !== null} variant="outline"
                className="rounded-2xl py-8 flex-col gap-2 h-auto border-2 hover:border-primary/40 hover:bg-primary/5">
                {loading === "notes" ? <Loader2 className="w-6 h-6 animate-spin" /> : <NotebookPen className="w-7 h-7 text-primary" />}
                <span className="font-bold">Kérj jegyzetet</span>
              </Button>
              <Button onClick={generatePractice} disabled={loading !== null} variant="outline"
                className="rounded-2xl py-8 flex-col gap-2 h-auto border-2 hover:border-chart-4/40 hover:bg-chart-4/5">
                {loading === "practice" ? <Loader2 className="w-6 h-6 animate-spin" /> : <ClipboardList className="w-7 h-7 text-chart-4" />}
                <span className="font-bold">Gyakorlódolgozat</span>
              </Button>
            </div>
            <Button variant="ghost" onClick={() => { setCardIdx(0); setView("cards"); }} className="mt-4 gap-1">
              <RotateCcw className="w-4 h-4" /> Újra végig
            </Button>
            <Button variant="ghost" onClick={() => { resetAI(); setView("hub"); }} className="mt-2 ml-2 text-muted-foreground">
              Vissza a Hubra
            </Button>
          </div>
        )}

        {/* AI NOTES */}
        {view === "notes" && aiNotes && (
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("done")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              <Button size="sm" variant="outline" onClick={generatePractice} disabled={loading !== null} className="rounded-xl gap-1">
                {loading === "practice" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Gyakorlódolgozat
              </Button>
            </div>
            <h2 className="text-2xl font-black mb-4">{aiNotes.title}</h2>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown>{aiNotes.markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* AI PRACTICE */}
        {view === "practice" && questions.length > 0 && (
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("done")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              {showResults && (
                <div className="text-sm font-bold">Eredmény: <span className="text-primary">{score}/{questions.length}</span></div>
              )}
            </div>
            <h2 className="text-2xl font-black mb-6">{practiceTitle}</h2>
            <div className="space-y-6">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const opts: Array<["A" | "B" | "C" | "D", string]> = [
                  ["A", q.option_a], ["B", q.option_b], ["C", q.option_c], ["D", q.option_d],
                ];
                return (
                  <div key={i} className="border border-border rounded-2xl p-4">
                    <p className="font-bold mb-3">{i + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {opts.map(([letter, text]) => {
                        const isUser = userAns === letter;
                        const isCorrect = q.correct_answer === letter;
                        let cls = "border-border bg-background hover:border-primary/40";
                        if (showResults) {
                          if (isCorrect) cls = "border-green-500 bg-green-500/10";
                          else if (isUser) cls = "border-destructive bg-destructive/10";
                        } else if (isUser) cls = "border-primary bg-primary/10";
                        return (
                          <button key={letter} type="button" disabled={showResults}
                            onClick={() => setAnswers((a) => ({ ...a, [i]: letter }))}
                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm ${cls}`}>
                            <span className="font-bold w-6">{letter}.</span>
                            <span className="flex-1">{text}</span>
                            {showResults && isCorrect && <Check className="w-4 h-4 text-green-600" />}
                            {showResults && isUser && !isCorrect && <X className="w-4 h-4 text-destructive" />}
                          </button>
                        );
                      })}
                    </div>
                    {showResults && <p className="text-xs text-muted-foreground mt-3 italic">💡 {q.explanation}</p>}
                  </div>
                );
              })}
            </div>
            {!showResults ? (
              <Button onClick={() => setShowResults(true)} disabled={Object.keys(answers).length < questions.length}
                className="w-full mt-6 rounded-xl gradient-primary text-primary-foreground font-bold py-6">
                Beadom ({Object.keys(answers).length}/{questions.length})
              </Button>
            ) : (
              <Button onClick={() => { setAnswers({}); setShowResults(false); }} variant="outline" className="w-full mt-6 rounded-xl gap-2">
                <RotateCcw className="w-4 h-4" /> Újra
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Learn;
