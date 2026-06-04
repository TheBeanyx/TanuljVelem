import { useEffect, useState, useRef } from "react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { StickyNote, Plus, Search, Download, Trash2, Eye, Edit3, Save } from "lucide-react";
import PomodoroWidget from "@/components/PomodoroWidget";

type Note = {
  id: string;
  title: string;
  markdown: string;
  topic: string | null;
  lesson_ref_title: string | null;
  updated_at: string;
};

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("learn_notes")
      .select("id, title, markdown, topic, lesson_ref_title, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) || []);
  };

  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("learn_notes")
      .insert({
        owner_id: user.id,
        title: "Új jegyzet",
        markdown: "# Új jegyzet\n\nKezdj el írni...",
        visibility: "private",
        length: "medium",
        difficulty: "medium",
        source: "manual",
      })
      .select("id, title, markdown, topic, lesson_ref_title, updated_at")
      .single();
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setNotes((n) => [data as Note, ...n]);
    setActive(data as Note);
    setEditing(true);
  };

  const update = (patch: Partial<Note>) => {
    if (!active) return;
    const next = { ...active, ...patch };
    setActive(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      await supabase.from("learn_notes")
        .update({ title: next.title, markdown: next.markdown, lesson_ref_title: next.lesson_ref_title })
        .eq("id", next.id);
      setSaving(false);
      setNotes((arr) => arr.map((n) => n.id === next.id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n));
    }, 600);
  };

  const remove = async (id: string) => {
    if (!confirm("Törlöd a jegyzetet?")) return;
    await supabase.from("learn_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  };

  const exportMd = (n: Note) => {
    const blob = new Blob([`# ${n.title}\n\n${n.markdown}`], { type: "text/markdown" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `${n.title || "jegyzet"}.md`; a.click();
    URL.revokeObjectURL(u);
  };

  const exportAll = () => {
    const text = notes.map((n) => `# ${n.title}\n\n${n.markdown}\n\n---\n`).join("\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `jegyzetek_${new Date().toISOString().slice(0,10)}.md`; a.click();
    URL.revokeObjectURL(u);
  };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.markdown || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-primary" /> Jegyzetek
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAll} disabled={notes.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Összes export
            </Button>
            <Button onClick={create}><Plus className="w-4 h-4 mr-1" /> Új jegyzet</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
                <Input className="pl-8" placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <ScrollArea className="h-[60vh]">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-6">Nincs jegyzeted. Hozz létre egyet!</p>
                ) : filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setActive(n); setEditing(false); }}
                    className={`w-full text-left p-2 rounded-md hover:bg-accent transition ${active?.id === n.id ? "bg-accent" : ""}`}
                  >
                    <div className="font-semibold truncate text-sm">{n.title}</div>
                    {n.lesson_ref_title && <Badge variant="outline" className="mt-1 text-[10px]">{n.lesson_ref_title}</Badge>}
                    <div className="text-[11px] text-muted-foreground">{new Date(n.updated_at).toLocaleDateString("hu-HU")}</div>
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {!active ? (
                <div className="text-center text-muted-foreground py-20">
                  <StickyNote className="w-16 h-16 mx-auto mb-2 opacity-30" />
                  Válassz egy jegyzetet, vagy hozz létre egy újat.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={active.title}
                      onChange={(e) => update({ title: e.target.value })}
                      className="text-xl font-bold border-0 px-0 focus-visible:ring-0"
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
                      {editing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportMd(active)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(active.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Lecke / téma (opcionális kapcsolat)"
                    value={active.lesson_ref_title || ""}
                    onChange={(e) => update({ lesson_ref_title: e.target.value })}
                    className="text-sm"
                  />
                  {editing ? (
                    <Textarea
                      value={active.markdown}
                      onChange={(e) => update({ markdown: e.target.value })}
                      className="min-h-[55vh] font-mono text-sm"
                      placeholder="Markdown támogatott..."
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none min-h-[55vh] p-2">
                      <ReactMarkdown>{active.markdown}</ReactMarkdown>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {saving ? <><Save className="w-3 h-3 animate-pulse" /> Mentés...</> : "Automatikus mentés"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <PomodoroWidget />
    </div>
  );
};

export default Notes;
