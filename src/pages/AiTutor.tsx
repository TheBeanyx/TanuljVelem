import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Send, Sparkles, ClipboardList, Loader2, ArrowRight, User, Plus, MessageSquare, Folder, FolderPlus, Trash2, Pencil, ChevronRight, ChevronDown, Menu, X } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; folder_id: string | null; updated_at: string };
type FolderRow = { id: string; name: string };

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const SUBJECTS = ["Matematika","Magyar","Történelem","Földrajz","Biológia","Fizika","Kémia","Angol","Német","Informatika","Egyéb"];
const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const WELCOME: Msg = { role: "assistant", content: "Szia! 👋 Én vagyok az AI tanárod. Mondj egy **tantárgyat** vagy **témakört**, és elmagyarázom — vagy kérj tőlem egy **gyakorlótesztet**, amit elmentek a Tesztek közé! 📚" };

const db: any = supabase;

const AiTutor = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { award } = useGamification();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [genTestOpen, setGenTestOpen] = useState(false);
  const [testTopic, setTestTopic] = useState("");
  const [testSubject, setTestSubject] = useState("Matematika");
  const [testGrade, setTestGrade] = useState("8");
  const [genLoading, setGenLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Load folders + threads
  const loadSidebar = async () => {
    if (!user) return;
    const [f, t] = await Promise.all([
      db.from("ai_chat_folders").select("id, name").eq("user_id", user.id).order("sort_order"),
      db.from("ai_chat_threads").select("id, title, folder_id, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]);
    setFolders(f.data || []);
    setThreads(t.data || []);
  };

  useEffect(() => { loadSidebar(); }, [user?.id]);

  const loadThread = async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    const { data } = await db.from("ai_chat_messages").select("role, content").eq("thread_id", id).order("created_at");
    const msgs: Msg[] = (data || []).map((m: any) => ({ role: m.role, content: m.content }));
    setMessages(msgs.length ? msgs : [WELCOME]);
  };

  const newThread = async (folderId: string | null = null) => {
    if (!user) return;
    const { data, error } = await db.from("ai_chat_threads").insert({ user_id: user.id, folder_id: folderId, title: "Új beszélgetés" }).select().single();
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    await loadSidebar();
    setActiveId(data.id);
    setMessages([WELCOME]);
    setSidebarOpen(false);
  };

  const deleteThread = async (id: string) => {
    if (!confirm("Törlöd ezt a beszélgetést?")) return;
    await db.from("ai_chat_threads").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setMessages([WELCOME]); }
    loadSidebar();
  };

  const renameThread = async (id: string, currentTitle: string) => {
    const t = prompt("Új név:", currentTitle);
    if (!t?.trim()) return;
    await db.from("ai_chat_threads").update({ title: t.trim() }).eq("id", id);
    loadSidebar();
  };

  const moveThread = async (id: string, folderId: string | null) => {
    await db.from("ai_chat_threads").update({ folder_id: folderId }).eq("id", id);
    loadSidebar();
  };

  const newFolder = async () => {
    if (!user) return;
    const name = prompt("Mappa neve:");
    if (!name?.trim()) return;
    await db.from("ai_chat_folders").insert({ user_id: user.id, name: name.trim(), sort_order: folders.length });
    loadSidebar();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Törlöd a mappát? (A beszélgetések megmaradnak)")) return;
    await db.from("ai_chat_folders").delete().eq("id", id);
    loadSidebar();
  };

  const renameFolder = async (id: string, current: string) => {
    const n = prompt("Új név:", current);
    if (!n?.trim()) return;
    await db.from("ai_chat_folders").update({ name: n.trim() }).eq("id", id);
    loadSidebar();
  };

  const ensureThread = async (): Promise<string | null> => {
    if (activeId) return activeId;
    if (!user) return null;
    const { data, error } = await db.from("ai_chat_threads").insert({ user_id: user.id, folder_id: null, title: "Új beszélgetés" }).select().single();
    if (error) { toast({ title: "Hiba", variant: "destructive" }); return null; }
    setActiveId(data.id);
    loadSidebar();
    return data.id;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const tid = await ensureThread();
    if (!tid) return;

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    award("tutor_message");

    // persist user msg + auto-title if first
    db.from("ai_chat_messages").insert({ thread_id: tid, role: "user", content: text });
    const currentThread = threads.find((t) => t.id === tid);
    if (!currentThread || currentThread.title === "Új beszélgetés") {
      const title = text.slice(0, 50);
      db.from("ai_chat_threads").update({ title, updated_at: new Date().toISOString() }).eq("id", tid).then(() => loadSidebar());
    } else {
      db.from("ai_chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
    }

    try {
      const resp = await fetch(TUTOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next }),
      });
      if (resp.status === 429) { toast({ title: "Túl sok kérés", variant: "destructive" }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "Nincs elég kredit", variant: "destructive" }); setLoading(false); return; }
      if (!resp.ok || !resp.body) { toast({ title: "AI hiba", variant: "destructive" }); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let so_far = "";
      let done = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) {
              so_far += c;
              setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: so_far } : m));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      if (so_far) {
        db.from("ai_chat_messages").insert({ thread_id: tid, role: "assistant", content: so_far });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Kapcsolódási hiba", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateTest = async () => {
    if (!testTopic.trim()) { toast({ title: "Adj meg egy témát!", variant: "destructive" }); return; }
    setGenLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { mode: "test", topic: testTopic, subject: testSubject, grade: parseInt(testGrade), creator_name: profile?.display_name || profile?.username || "AI Tanár" },
      });
      if (error || !data?.test_id) {
        toast({ title: "Hiba a teszt generálásnál", description: data?.error || error?.message, variant: "destructive" });
        return;
      }
      toast({ title: "Teszt elkészült! 🎉", description: `${data.count} kérdés mentve a Tesztek közé.` });
      award("ai_generation");
      setMessages((prev) => [...prev, { role: "assistant", content: `✅ **Teszt elkészült:** *${data.title}* (${data.count} kérdés). Megtalálod a [Tesztek](/tests) között!` }]);
      setGenTestOpen(false);
      setTestTopic("");
    } catch (e) {
      console.error(e);
      toast({ title: "Hiba", variant: "destructive" });
    } finally { setGenLoading(false); }
  };

  const quickPrompts = ["Magyarázd el a Pitagorasz-tételt","Mi a fotoszintézis?","Foglald össze a 2. világháború kezdetét","Mik a szófajok?"];

  const rootThreads = threads.filter((t) => !t.folder_id);
  const threadsByFolder = (fid: string) => threads.filter((t) => t.folder_id === fid);

  const ThreadRow = ({ t }: { t: Thread }) => (
    <div className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${activeId === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`} onClick={() => loadThread(t.id)}>
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
      <span className="flex-1 truncate">{t.title}</span>
      <button onClick={(e) => { e.stopPropagation(); renameThread(t.id, t.title); }} className="opacity-0 group-hover:opacity-100 p-0.5"><Pencil className="w-3 h-3" /></button>
      <Select value={t.folder_id || "root"} onValueChange={(v) => moveThread(t.id, v === "root" ? null : v)}>
        <SelectTrigger className="w-6 h-6 p-0 border-0 opacity-0 group-hover:opacity-100 [&>svg]:hidden"><Folder className="w-3 h-3" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="root">Mappa nélkül</SelectItem>
          {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 p-0.5"><Trash2 className="w-3 h-3 text-destructive" /></button>
    </div>
  );

  const Sidebar = (
    <div className="w-full h-full bg-card border-r border-border flex flex-col">
      <div className="p-3 border-b border-border flex gap-2">
        <Button size="sm" onClick={() => newThread(null)} className="flex-1 rounded-xl gap-1"><Plus className="w-3.5 h-3.5" /> Új chat</Button>
        <Button size="sm" variant="outline" onClick={newFolder} className="rounded-xl gap-1"><FolderPlus className="w-3.5 h-3.5" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map((f) => {
          const isOpen = openFolders[f.id] ?? true;
          const list = threadsByFolder(f.id);
          return (
            <div key={f.id}>
              <div className="group flex items-center gap-1 px-1 py-1 text-xs font-bold uppercase text-muted-foreground">
                <button onClick={() => setOpenFolders({ ...openFolders, [f.id]: !isOpen })} className="p-0.5">
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <Folder className="w-3 h-3" />
                <span className="flex-1 truncate">{f.name}</span>
                <button onClick={() => newThread(f.id)} className="opacity-0 group-hover:opacity-100"><Plus className="w-3 h-3" /></button>
                <button onClick={() => renameFolder(f.id, f.name)} className="opacity-0 group-hover:opacity-100"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => deleteFolder(f.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3 text-destructive" /></button>
              </div>
              {isOpen && <div className="ml-3 space-y-0.5">{list.map((t) => <ThreadRow key={t.id} t={t} />)}</div>}
            </div>
          );
        })}
        {rootThreads.length > 0 && folders.length > 0 && <div className="px-1 pt-3 pb-1 text-xs font-bold uppercase text-muted-foreground">Beszélgetések</div>}
        {rootThreads.map((t) => <ThreadRow key={t.id} t={t} />)}
        {threads.length === 0 && <p className="text-xs text-muted-foreground text-center p-6">Még nincs beszélgetés. Kezdj egy újat!</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" className="lg:hidden rounded-full" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-black">AI Tanár</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Magyarázat, kérdés-felelet vagy generált gyakorlóteszt egy helyen.</p>
          </div>
          <Button onClick={() => setGenTestOpen((v) => !v)} size="sm" className="rounded-full gap-1 sm:gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
            <ClipboardList className="w-4 h-4" /> <span className="hidden sm:inline">Teszt generálás</span>
          </Button>
        </div>

        {genTestOpen && (
          <Card className="p-4 mb-4 border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-3 font-bold"><Sparkles className="w-4 h-4 text-primary" /> Új gyakorlóteszt</div>
            <div className="grid sm:grid-cols-3 gap-2 mb-3">
              <Input placeholder="Téma (pl. törtek)" value={testTopic} onChange={(e) => setTestTopic(e.target.value)} className="rounded-xl sm:col-span-3" />
              <Select value={testSubject} onValueChange={setTestSubject}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={testGrade} onValueChange={setTestGrade}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={String(g)}>{g}. évf.</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={generateTest} disabled={genLoading} className="rounded-xl">
                {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Generálás <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">A kész teszt automatikusan a <Link to="/tests" className="underline text-primary">Tesztek</Link> oldalra kerül.</p>
          </Card>
        )}

        <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[420px]">
          <div className="hidden lg:block overflow-hidden rounded-2xl">{Sidebar}</div>
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
                <div className="h-full flex flex-col">
                  <div className="flex justify-end p-2 bg-card border-b border-border"><Button size="icon" variant="ghost" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></Button></div>
                  <div className="flex-1 min-h-0">{Sidebar}</div>
                </div>
              </div>
            </div>
          )}

          <Card className="flex flex-col min-h-0 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 sm:gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"}`}>
                    {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 break-words">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm break-words">{m.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pl-11">
                  <Loader2 className="w-4 h-4 animate-spin" /> AI gondolkodik…
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-2">
                {quickPrompts.map((p) => (
                  <button key={p} onClick={() => setInput(p)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors">{p}</button>
                ))}
              </div>
            )}

            <div className="border-t border-border p-2 sm:p-3 flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Kérdezz bármit…" disabled={loading} className="rounded-xl" />
              <Button onClick={send} disabled={loading || !input.trim()} className="rounded-xl gap-1 shrink-0">
                <Send className="w-4 h-4" /> <span className="hidden sm:inline">Küldés</span>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AiTutor;
