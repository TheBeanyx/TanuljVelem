import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, UserPlus, Plus, Copy, Crown, MessageSquare, Send, Trash2, BookOpen, AtSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/integrations/supabase/client";

type ClassData = { id: string; name: string; grade: number; code: string; owner_id: string; created_at: string; head_teacher_id?: string | null };
type Member = { user_id: string; display_name: string; role: string; isOwner: boolean; isHeadTeacher?: boolean };
type ChatMessage = { id: string; user_id: string; text: string; message_type: string; homework_id: string | null; created_at: string; sender_name?: string };

const Classes = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState(8);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionType, setMentionType] = useState<"teacher" | "all" | null>(null);
  const [mentionOptions, setMentionOptions] = useState<{ id: string; name: string; role: string }[]>([]);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = profile?.role === "teacher";
  const { markRead } = useUnreadCounts();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchClasses = async () => {
    if (!user) return;
    const { data: owned } = await supabase.from("classes").select("*").eq("owner_id", user.id);
    const { data: memberships } = await supabase.from("class_members").select("class_id").eq("user_id", user.id);
    let memberClasses: ClassData[] = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m: any) => m.class_id);
      const { data } = await supabase.from("classes").select("*").in("id", ids);
      memberClasses = (data || []) as ClassData[];
    }
    const all = [...(owned || []), ...memberClasses];
    const unique = Array.from(new Map(all.map((c) => [c.id, c])).values()) as ClassData[];
    setClasses(unique);
    if (unique.length > 0 && !selectedClass) setSelectedClass(unique[0]);
  };

  const fetchMembers = async (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const { data } = await supabase.from("class_members").select("user_id").eq("class_id", classId);
    const userIds = (data || []).map((m: any) => m.user_id);
    if (cls) userIds.push(cls.owner_id);
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) { setMembers([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, username, role").in("id", uniqueIds);
    const memberList: Member[] = (profiles || []).map((p: any) => ({
      user_id: p.id,
      display_name: p.display_name || p.username,
      role: p.role,
      isOwner: cls?.owner_id === p.id,
      isHeadTeacher: (cls as any)?.head_teacher_id === p.id,
    }));
    setMembers(memberList);
  };

  const fetchMessages = async (classId: string) => {
    const { data } = await supabase
      .from("class_messages")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (!data) { setMessages([]); return; }
    const userIds = [...new Set(data.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", userIds);
    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nameMap[p.id] = p.display_name || p.username; });
    setMessages(data.map((m: any) => ({ ...m, sender_name: nameMap[m.user_id] || "Ismeretlen" })));
  };

  useEffect(() => { fetchClasses(); }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchMembers(selectedClass.id);
      fetchMessages(selectedClass.id);
    }
  }, [selectedClass?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return;
    const { data, error } = await supabase.from("classes").insert({
      name: newClassName.trim(),
      grade: newClassGrade,
      owner_id: user.id,
    }).select().single();
    if (error) { toast({ title: "Hiba", description: "Nem sikerült létrehozni.", variant: "destructive" }); return; }
    toast({ title: "Osztály létrehozva!" });
    setCreateOpen(false);
    setNewClassName("");
    await fetchClasses();
    if (data) setSelectedClass(data as ClassData);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    const { data: cls } = await supabase.from("classes").select("*").eq("code", joinCode.trim().toUpperCase()).single();
    if (!cls) { toast({ title: "Nem található osztály ezzel a kóddal.", variant: "destructive" }); return; }
    const { error } = await supabase.from("class_members").insert({ class_id: cls.id, user_id: user.id });
    if (error) {
      if (error.code === "23505") toast({ title: "Már tag vagy ebben az osztályban." });
      else toast({ title: "Hiba a csatlakozásnál.", variant: "destructive" });
      return;
    }
    toast({ title: `Csatlakoztál: ${cls.name}` });
    setJoinOpen(false);
    setJoinCode("");
    await fetchClasses();
    setSelectedClass(cls as ClassData);
  };

  // Mention handling
  const handleMessageChange = (value: string) => {
    setMessage(value);
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textUpToCursor = value.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\S*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      if (query === "osztályfőnök" || query.startsWith("osztályfőnök")) {
        // Auto-insert head teacher name
        const headTeacher = members.find((m) => m.isHeadTeacher);
        if (headTeacher) {
          const before = value.slice(0, cursorPos - mentionMatch[0].length);
          const after = value.slice(cursorPos);
          setMessage(`${before}@${headTeacher.display_name} ${after}`);
          setShowMentionMenu(false);
          return;
        }
      }
      if (query === "tanár" || query.startsWith("tanár")) {
        const teachers = members.filter((m) => m.role === "teacher");
        setMentionOptions(teachers.map((t) => ({ id: t.user_id, name: t.display_name, role: "Tanár" })));
        setMentionType("teacher");
        setShowMentionMenu(true);
        return;
      }
      // General @ mention - show all members
      const filtered = members.filter((m) =>
        m.display_name.toLowerCase().includes(query)
      );
      setMentionOptions(filtered.map((m) => ({ id: m.user_id, name: m.display_name, role: m.role === "teacher" ? "Tanár" : "Diák" })));
      setMentionType("all");
      setMentionFilter(query);
      setShowMentionMenu(filtered.length > 0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const textUpToCursor = message.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\S*)$/);
    if (mentionMatch) {
      const before = message.slice(0, cursorPos - mentionMatch[0].length);
      const after = message.slice(cursorPos);
      setMessage(`${before}@${name} ${after}`);
    }
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const insertAllTeachers = () => {
    const teachers = members.filter((m) => m.role === "teacher");
    const names = teachers.map((t) => `@${t.display_name}`).join(" ");
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const textUpToCursor = message.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\S*)$/);
    if (mentionMatch) {
      const before = message.slice(0, cursorPos - mentionMatch[0].length);
      const after = message.slice(cursorPos);
      setMessage(`${before}${names} ${after}`);
    }
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedClass || !user) return;
    const { data: msgData } = await supabase.from("class_messages").insert({
      class_id: selectedClass.id,
      user_id: user.id,
      text: message.trim(),
      message_type: "chat",
    }).select().single();

    // Find mentioned users and create mention records
    if (msgData) {
      const mentionRegex = /@([^\s@]+(?:\s[^\s@]+)?)/g;
      let match;
      const mentionedNames: string[] = [];
      while ((match = mentionRegex.exec(message)) !== null) {
        mentionedNames.push(match[1].trim());
      }
      for (const name of mentionedNames) {
        const member = members.find((m) => m.display_name === name);
        if (member && member.user_id !== user.id) {
          await supabase.from("mentions").insert({
            class_id: selectedClass.id,
            message_id: msgData.id,
            mentioned_user_id: member.user_id,
            mentioner_user_id: user.id,
          });
        }
      }
    }

    setMessage("");
    fetchMessages(selectedClass.id);
  };

  const handleHomeworkClick = async (homeworkId: string) => {
    navigate("/dashboard");
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    await supabase.from("classes").delete().eq("id", selectedClass.id);
    toast({ title: "Osztály törölve!" });
    setSelectedClass(null);
    fetchClasses();
  };

  const handleSetHeadTeacher = async (teacherId: string) => {
    if (!selectedClass) return;
    await supabase.from("classes").update({ head_teacher_id: teacherId } as any).eq("id", selectedClass.id);
    toast({ title: "Osztályfőnök beállítva!" });
    const updated = { ...selectedClass, head_teacher_id: teacherId };
    setSelectedClass(updated);
    setClasses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    fetchMembers(selectedClass.id);
  };

  const teacherMembers = members.filter((m) => m.role === "teacher");
  const headTeacher = members.find((m) => m.isHeadTeacher);

  // Render mention-highlighted text - all mentions green
  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        const isMember = members.some((m) => m.display_name === name);
        if (isMember) {
          return <span key={i} className="text-green-500 font-semibold">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button></Link>
            <h1 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Osztályok</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2"><UserPlus className="w-4 h-4" /> Csatlakozás</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Csatlakozás osztályhoz</DialogTitle>
                  <DialogDescription>Add meg az osztály kódját a csatlakozáshoz.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>Osztály kód</Label><Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="pl. MAT8A1" className="mt-1.5 rounded-xl uppercase" maxLength={6} /></div>
                  <Button onClick={handleJoin} className="w-full rounded-xl bg-primary">Csatlakozás</Button>
                </div>
              </DialogContent>
            </Dialog>
            {isTeacher && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full gap-2 bg-primary"><Plus className="w-4 h-4" /> Új Osztály</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Új osztály létrehozása</DialogTitle>
                    <DialogDescription>Hozz létre egy új osztályt a diákjaid számára.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Osztály neve *</Label><Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="pl. 8.A Matematika" className="mt-1.5 rounded-xl" /></div>
                    <div><Label>Évfolyam</Label>
                      <select value={newClassGrade} onChange={(e) => setNewClassGrade(Number(e.target.value))} className="w-full mt-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}. osztály</option>)}
                      </select>
                    </div>
                    <Button onClick={handleCreateClass} className="w-full rounded-xl bg-primary">Létrehozás</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-3">
            {classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Még nincs osztályod</p>
              </div>
            ) : classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedClass?.id === c.id ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:shadow-sm"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.grade}. évfolyam</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedClass ? (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {members.length} tag · {selectedClass.grade}. évfolyam
                    {headTeacher && <span> · Osztályfőnök: <span className="text-primary font-medium">{headTeacher.display_name}</span></span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => { navigator.clipboard.writeText(selectedClass.code); toast({ title: "Kód másolva!" }); }}>
                    <Copy className="w-3 h-3" /> {selectedClass.code}
                  </Badge>
                  {selectedClass.owner_id === user?.id && (
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={handleDeleteClass}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Tabs defaultValue="chat">
                <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-5 pt-2">
                  <TabsTrigger value="chat" className="rounded-t-lg">Chat</TabsTrigger>
                  <TabsTrigger value="members" className="rounded-t-lg">Tagok ({members.length})</TabsTrigger>
                  {selectedClass.owner_id === user?.id && (
                    <TabsTrigger value="settings" className="rounded-t-lg">Beállítások</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="chat" className="p-0">
                  <div className="h-[400px] flex flex-col">
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Még nincsenek üzenetek</p>
                          <p className="text-xs mt-1 opacity-60">Tipp: Írd be @osztályfőnök vagy @tanár az említéshez</p>
                        </div>
                      )}
                      {messages.map((m) => {
                        const isOwn = m.user_id === user?.id;
                        const isHomework = m.message_type === "homework";
                        return (
                          <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                isHomework
                                  ? "bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                                  : isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                              onClick={isHomework && m.homework_id ? () => handleHomeworkClick(m.homework_id!) : undefined}
                            >
                              {!isOwn && <p className="text-xs font-semibold mb-1 opacity-70">{m.sender_name}</p>}
                              {isHomework && <BookOpen className="w-4 h-4 inline mr-1 text-primary" />}
                              <p className="text-sm inline">{renderMessageText(m.text)}</p>
                              <p className={`text-[10px] mt-1 ${isOwn && !isHomework ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(m.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="relative p-4 border-t border-border flex gap-2">
                      {showMentionMenu && mentionOptions.length > 0 && (
                        <div className="absolute bottom-full left-4 right-4 mb-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                          {mentionType === "teacher" && (
                            <button
                              onClick={insertAllTeachers}
                              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border flex items-center gap-2"
                            >
                              <AtSign className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-sm">Összes tanár említése</span>
                            </button>
                          )}
                          {mentionOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => insertMention(opt.name)}
                              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {opt.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{opt.name}</p>
                                <p className="text-xs text-muted-foreground">{opt.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <Input
                        ref={inputRef}
                        value={message}
                        onChange={(e) => handleMessageChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !showMentionMenu) handleSendMessage();
                          if (e.key === "Escape") setShowMentionMenu(false);
                        }}
                        placeholder="Üzenet írása... (@osztályfőnök, @tanár)"
                        className="rounded-full"
                      />
                      <Button size="icon" className="rounded-full bg-primary shrink-0" onClick={handleSendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="p-5">
                  <div className="space-y-3">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {m.display_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-1.5">
                              {m.display_name}
                              {m.isOwner && <Crown className="w-3.5 h-3.5 text-warning" />}
                              {m.isHeadTeacher && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">Osztályfőnök</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground">{m.role === "teacher" ? "Tanár" : "Diák"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="p-5">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-bold">Osztályfőnök kiválasztása</Label>
                      <p className="text-xs text-muted-foreground mb-2">A diákok @osztályfőnök-kel említhetik a chatben.</p>
                      {teacherMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nincs tanár tag az osztályban.</p>
                      ) : (
                        <Select
                          value={(selectedClass as any)?.head_teacher_id || ""}
                          onValueChange={handleSetHeadTeacher}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Válassz osztályfőnököt..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherMembers.map((t) => (
                              <SelectItem key={t.user_id} value={t.user_id}>{t.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Még nincs osztályod</p>
                <p className="text-sm mt-1">Hozz létre egyet vagy csatlakozz egy meglévőhöz!</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Classes;
