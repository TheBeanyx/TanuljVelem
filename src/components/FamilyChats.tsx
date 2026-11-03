import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Trash2, Users, User as UserIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import RichMarkdown from "@/components/RichMarkdown";
import { fetchLinkedChildren, fetchProfiles, fetchStudentTeachers, type Person } from "@/lib/familyData";

type Chat = { id: string; parent_id: string; student_id: string; teacher_id: string; include_student: boolean; created_at: string };
type Msg = { id: string; chat_id: string; sender_id: string; text: string; created_at: string };

const FamilyChats = ({ onlyStudentId }: { onlyStudentId?: string }) => {
  const { user, profile } = useAuth();
  const isParent = profile?.role === "parent";
  const [chats, setChats] = useState<Chat[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [children, setChildren] = useState<Person[]>([]);
  const [teachers, setTeachers] = useState<(Person & { classes: string[] })[]>([]);
  const [form, setForm] = useState({ student: "", teacher: "", mode: "private" as "private" | "group" });
  const endRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    if (!user) return;
    let q = supabase.from("family_chats").select("*").order("created_at", { ascending: false });
    if (onlyStudentId) q = q.eq("student_id", onlyStudentId);
    const { data } = await q;
    const list = (data || []) as Chat[];
    setChats(list);
    setPeople(await fetchProfiles(list.flatMap((c) => [c.parent_id, c.student_id, c.teacher_id])));
  };
  useEffect(() => { loadChats(); }, [user?.id, onlyStudentId]);

  const loadMessages = async (chat: Chat) => {
    const { data } = await supabase.from("family_chat_messages").select("*").eq("chat_id", chat.id).order("created_at");
    setMessages((data || []) as Msg[]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected);
    const ch = supabase.channel(`fc-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "family_chat_messages", filter: `chat_id=eq.${selected.id}` }, () => loadMessages(selected))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  const openNew = async () => {
    if (!user) return;
    const kids = await fetchLinkedChildren(user.id);
    setChildren(kids);
    const first = onlyStudentId || kids[0]?.id || "";
    setForm({ student: first, teacher: "", mode: "private" });
    setTeachers(first ? await fetchStudentTeachers(first) : []);
    setNewOpen(true);
  };

  const changeStudent = async (id: string) => {
    setForm((f) => ({ ...f, student: id, teacher: "" }));
    setTeachers(await fetchStudentTeachers(id));
  };

  const createChat = async () => {
    if (!form.student || !form.teacher) return;
    const { data, error } = await supabase.rpc("create_family_chat", { _student: form.student, _teacher: form.teacher, _include_student: form.mode === "group" });
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    setNewOpen(false);
    await loadChats();
    const { data: c } = await supabase.from("family_chats").select("*").eq("id", data as string).maybeSingle();
    if (c) setSelected(c as Chat);
  };

  const send = async () => {
    if (!user || !selected || !input.trim()) return;
    const text = input.trim();
    setInput("");
    const { error } = await supabase.from("family_chat_messages").insert({ chat_id: selected.id, sender_id: user.id, text });
    if (error) { toast({ title: "Nem sikerült elküldeni", variant: "destructive" }); setInput(text); return; }
    loadMessages(selected);
  };

  const deleteChat = async (c: Chat) => {
    if (!confirm("Törlöd ezt a beszélgetést mindenkinél?")) return;
    await supabase.from("family_chats").delete().eq("id", c.id);
    setSelected(null);
    loadChats();
  };

  const name = (id: string) => people[id]?.name || "…";
  const title = (c: Chat) => c.include_student
    ? `${name(c.parent_id)}, ${name(c.teacher_id)} és ${name(c.student_id)}`
    : user?.id === c.teacher_id ? `${name(c.parent_id)} (${name(c.student_id)} szülője)` : `${name(c.teacher_id)} tanár`;
  const roleTag = (id: string, c: Chat) => id === c.parent_id ? "Szülő" : id === c.teacher_id ? "Tanár" : "Diák";

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden grid md:grid-cols-[260px_1fr] min-h-[480px]">
      <aside className={`border-b md:border-b-0 md:border-r border-border p-3 space-y-2 ${selected ? "hidden md:block" : ""}`}>
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="font-bold text-sm">Beszélgetések</p>
          {isParent && <Button size="sm" className="rounded-full gap-1" onClick={openNew}><Plus className="w-4 h-4" /> Új</Button>}
        </div>
        {chats.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10 px-2">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {isParent ? "Indíts beszélgetést a gyermeked egyik tanárával." : "Még nincs szülői beszélgetésed."}
          </div>
        ) : chats.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)}
            className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <p className="font-semibold text-sm truncate">{title(c)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {c.include_student ? <><Users className="w-3 h-3" /> Hármas chat</> : <><UserIcon className="w-3 h-3" /> Privát</>}
            </p>
          </button>
        ))}
      </aside>

      <section className={`flex flex-col min-w-0 ${selected ? "" : "hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8 text-center">Válassz egy beszélgetést.</div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <Button size="icon" variant="ghost" className="md:hidden" aria-label="Vissza" onClick={() => setSelected(null)}><ArrowLeft className="w-4 h-4" /></Button>
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{title(selected)}</p>
                <p className="text-xs text-muted-foreground">Gyermek: {name(selected.student_id)}</p>
              </div>
              {selected.parent_id === user?.id && (
                <Button size="icon" variant="ghost" aria-label="Beszélgetés törlése" onClick={() => deleteChat(selected)}><Trash2 className="w-4 h-4" /></Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh]">
              {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Még nincs üzenet. Írj elsőként!</p>}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 break-words ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {!mine && <p className="text-[11px] font-bold opacity-80 mb-0.5">{name(m.sender_id)} <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">{roleTag(m.sender_id, selected)}</Badge></p>}
                      <div className="text-sm"><RichMarkdown content={m.text} /></div>
                      <p className="text-[10px] opacity-60 mt-0.5 text-right">{new Date(m.created_at).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Írj üzenetet…" rows={1} className="rounded-xl min-h-[44px] resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <Button onClick={send} size="icon" className="rounded-xl h-11 w-11 shrink-0" aria-label="Küldés"><Send className="w-4 h-4" /></Button>
            </div>
          </>
        )}
      </section>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Új beszélgetés</DialogTitle>
            <DialogDescription>Válaszd ki a gyermeked egyik tanárát.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!onlyStudentId && (
              <div>
                <Label>Gyermek</Label>
                <select value={form.student} onChange={(e) => changeStudent(e.target.value)} className="w-full mt-1 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  {children.length === 0 && <option value="">Nincs kapcsolt gyermek</option>}
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label>Tanár</Label>
              <select value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} className="w-full mt-1 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <option value="">{teachers.length ? "Válassz tanárt…" : "A gyermek osztályaiban nincs tanár"}</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.classes.length ? ` · ${t.classes.join(", ")}` : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([["private", "🔒 Privát", "Csak te és a tanár"], ["group", "👪 Hármas", "Tanár, diák és szülő"]] as const).map(([v, l, d]) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, mode: v })}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${form.mode === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <p className="font-bold text-sm">{l}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createChat} disabled={!form.student || !form.teacher} className="rounded-xl">Beszélgetés indítása</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyChats;
