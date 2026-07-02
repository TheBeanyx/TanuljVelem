import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users2, Plus, Copy, LogIn, Send, Crown, LogOut, Trash2, MessageSquare, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";

type Group = { id: string; owner_id: string; name: string; description: string | null; subject: string | null; join_code: string; created_at: string };
type Member = { user_id: string; display_name: string; username: string; isOwner: boolean };
type Msg = { id: string; sender_id: string; text: string; created_at: string; sender_name?: string };

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const StudyGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", description: "", subject: "" });
  const chatEnd = useRef<HTMLDivElement>(null);

  const fetchGroups = async () => {
    if (!user) return;
    const { data: myMems } = await supabase.from("study_group_members").select("group_id").eq("user_id", user.id);
    const ids = (myMems || []).map((m: any) => m.group_id);
    const { data: owned } = await supabase.from("study_groups").select("*").eq("owner_id", user.id);
    let joined: Group[] = [];
    if (ids.length) {
      const { data } = await supabase.from("study_groups").select("*").in("id", ids);
      joined = (data || []) as Group[];
    }
    const all = [...(owned || []), ...joined];
    const uniq = Array.from(new Map(all.map((g: any) => [g.id, g])).values()) as Group[];
    setGroups(uniq);
    if (uniq.length && !selected) setSelected(uniq[0]);
  };

  const fetchMembers = async (g: Group) => {
    const { data: mems } = await supabase.from("study_group_members").select("user_id").eq("group_id", g.id);
    const ids = [...new Set([...(mems || []).map((m: any) => m.user_id), g.owner_id])];
    if (!ids.length) return setMembers([]);
    const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
    setMembers((profs || []).map((p: any) => ({
      user_id: p.id,
      display_name: p.display_name || p.username,
      username: p.username,
      isOwner: p.id === g.owner_id,
    })));
  };

  const fetchMessages = async (g: Group) => {
    const { data } = await supabase.from("study_group_messages").select("*").eq("group_id", g.id).order("created_at", { ascending: true }).limit(200);
    const rows = (data || []) as Msg[];
    const ids = [...new Set(rows.map((r) => r.sender_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p.display_name || p.username]));
      rows.forEach((r) => { r.sender_name = map.get(r.sender_id) || "Névtelen"; });
    }
    setMessages(rows);
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { fetchGroups(); }, [user]);

  useEffect(() => {
    if (!selected) return;
    fetchMembers(selected);
    fetchMessages(selected);
    const ch = supabase
      .channel(`sg-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${selected.id}` }, () => fetchMessages(selected))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  const createGroup = async () => {
    if (!user || !newGroup.name.trim()) return;
    const { data, error } = await supabase.from("study_groups").insert({
      owner_id: user.id,
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      subject: newGroup.subject.trim() || null,
      join_code: genCode(),
    }).select().single();
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    await supabase.from("study_group_members").insert({ group_id: (data as any).id, user_id: user.id });
    toast({ title: "Csoport létrehozva", description: `Kód: ${(data as any).join_code}` });
    setCreateOpen(false);
    setNewGroup({ name: "", description: "", subject: "" });
    fetchGroups();
    setSelected(data as Group);
  };

  const joinGroup = async () => {
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    const { data: g } = await supabase.from("study_groups").select("*").eq("join_code", code).maybeSingle();
    if (!g) return toast({ title: "Nincs ilyen kód", variant: "destructive" });
    const { error } = await supabase.from("study_group_members").insert({ group_id: (g as any).id, user_id: user.id });
    if (error && !error.message.includes("duplicate")) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Csatlakoztál", description: (g as any).name });
    setJoinOpen(false); setJoinCode("");
    fetchGroups();
    setSelected(g as Group);
  };

  const leaveGroup = async (g: Group) => {
    if (!user) return;
    if (!confirm(`Kilépsz a "${g.name}" csoportból?`)) return;
    await supabase.from("study_group_members").delete().eq("group_id", g.id).eq("user_id", user.id);
    if (g.owner_id === user.id) {
      if (confirm("Te vagy a tulajdonos. Törlöd is a csoportot?")) {
        await supabase.from("study_groups").delete().eq("id", g.id);
      }
    }
    setSelected(null);
    fetchGroups();
  };

  const sendMessage = async () => {
    if (!user || !selected || !input.trim()) return;
    const text = input.trim();
    setInput("");
    const { error } = await supabase.from("study_group_messages").insert({
      group_id: selected.id, sender_id: user.id, text,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    fetchMessages(selected);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kód másolva", description: code });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2"><Users2 className="w-7 h-7 text-primary" /> Tanulócsoportok</h1>
            <p className="text-sm text-muted-foreground">Alkoss vagy csatlakozz kis tanulócsoportokhoz és csevegjetek együtt.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild><Button variant="outline" className="rounded-xl gap-2"><LogIn className="w-4 h-4" /> Csatlakozás</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Csatlakozás csoporthoz</DialogTitle><DialogDescription>Add meg a 6 karakteres csatlakozási kódot.</DialogDescription></DialogHeader>
                <Input placeholder="pl. AB12CD" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="rounded-xl uppercase tracking-widest text-center font-mono" maxLength={8} />
                <DialogFooter><Button onClick={joinGroup} className="rounded-xl">Csatlakozom</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Új csoport</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Új tanulócsoport</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Név</Label><Input value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} className="rounded-xl" placeholder="pl. Matek suli" /></div>
                  <div><Label>Tantárgy (opcionális)</Label><Input value={newGroup.subject} onChange={(e) => setNewGroup({ ...newGroup, subject: e.target.value })} className="rounded-xl" placeholder="pl. Matematika" /></div>
                  <div><Label>Leírás</Label><Textarea value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} rows={3} className="rounded-xl" placeholder="Mire fókuszáltok?" /></div>
                </div>
                <DialogFooter><Button onClick={createGroup} className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Létrehozás</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[280px_1fr_240px] gap-4">
          {/* Group list */}
          <div className="bg-card rounded-2xl border border-border p-3 space-y-2 h-fit">
            <h2 className="font-bold text-sm px-2 pt-1 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Csoportjaim ({groups.length})</h2>
            {groups.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">Még nincs csoportod. Hozz létre egyet vagy csatlakozz kóddal.</p>}
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g)}
                className={`w-full text-left rounded-xl px-3 py-2 border transition ${selected?.id === g.id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted/50"}`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold flex-1 truncate">{g.name}</p>
                  {g.owner_id === user?.id && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                {g.subject && <p className="text-xs text-muted-foreground truncate">{g.subject}</p>}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="bg-card rounded-2xl border border-border flex flex-col min-h-[70vh]">
            {!selected ? (
              <div className="flex-1 grid place-items-center text-muted-foreground text-sm p-6 text-center">
                Válassz egy csoportot, vagy hozz létre egyet a fentiek segítségével.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="font-bold flex items-center gap-2 truncate">{selected.name} {selected.subject && <Badge variant="secondary" className="rounded-full text-[10px]">{selected.subject}</Badge>}</h2>
                    {selected.description && <p className="text-xs text-muted-foreground line-clamp-2">{selected.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCode(selected.join_code)} className="font-mono text-xs bg-muted rounded-lg px-2 py-1 flex items-center gap-1 hover:bg-muted/70" title="Kód másolása">
                      {selected.join_code} <Copy className="w-3 h-3" />
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => leaveGroup(selected)} className="rounded-xl gap-1 text-destructive">
                      {selected.owner_id === user?.id ? <><Trash2 className="w-3.5 h-3.5" /> Kezelés</> : <><LogOut className="w-3.5 h-3.5" /> Kilép</>}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Még nincs üzenet. Írj elsőként!</p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{m.sender_name}</p>}
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                          </div>
                          <p className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEnd} />
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Üzenet… (Markdown támogatott)"
                    className="rounded-xl"
                  />
                  <Button onClick={sendMessage} className="rounded-xl gap-1"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            )}
          </div>

          {/* Members */}
          <div className="bg-card rounded-2xl border border-border p-3 h-fit">
            <h2 className="font-bold text-sm px-2 pt-1 mb-2 flex items-center gap-2"><Users2 className="w-4 h-4" /> Tagok ({members.length})</h2>
            {members.length === 0 && <p className="text-xs text-muted-foreground p-2">—</p>}
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/20 grid place-items-center text-xs font-bold">{m.display_name.charAt(0).toUpperCase()}</div>
                  <span className="flex-1 truncate">{m.display_name}</span>
                  {m.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyGroups;
