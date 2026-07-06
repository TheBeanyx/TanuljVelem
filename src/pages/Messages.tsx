import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MessageSquare, Send, Search, Users, Reply, X, AlertTriangle, Shield, Inbox, Lightbulb, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/integrations/supabase/client";

type UserProfile = { id: string; username: string; display_name: string | null; role: string };
type Conversation = { id: string; name: string; lastMsg: string; lastMsgTime: string; recipientId: string };
type ChatMessage = {
  id: string; text: string; sender_id: string; receiver_id: string;
  reply_to_id: string | null; is_warning?: boolean; is_system?: boolean;
  is_suggestion?: boolean; points_delta?: number | null; category?: string;
  created_at: string; reply_text?: string; reply_sender_name?: string;
};

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [adminMsgs, setAdminMsgs] = useState<ChatMessage[]>([]);
  const [adminFilter, setAdminFilter] = useState<"all" | "warning" | "points" | "suggestion">("all");
  const { user } = useAuth();
  const { markRead } = useUnreadCounts();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from("direct_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!data) { setConversations([]); return; }

    // Admin/system inbox (received system messages)
    const admin = data.filter((m: any) => m.receiver_id === user.id && (m.is_system || m.is_suggestion));
    setAdminMsgs(admin as ChatMessage[]);

    // Group normal DMs
    const partnerMap = new Map<string, { lastMsg: string; lastTime: string }>();
    for (const msg of data) {
      if (msg.is_system) continue; // hide system from normal conversation list
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { lastMsg: msg.text, lastTime: msg.created_at });
    }
    const partnerIds = [...partnerMap.keys()];
    if (partnerIds.length === 0) { setConversations([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, username, display_name").in("id", partnerIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name || p.username]));
    const convos: Conversation[] = partnerIds.map((pid) => ({
      id: pid, name: nameMap.get(pid) || "Ismeretlen",
      lastMsg: partnerMap.get(pid)!.lastMsg, lastMsgTime: partnerMap.get(pid)!.lastTime, recipientId: pid,
    }));
    convos.sort((a, b) => new Date(b.lastMsgTime).getTime() - new Date(a.lastMsgTime).getTime());
    setConversations(convos);
  };

  const fetchChatMessages = async (partnerId: string) => {
    if (!user) return;
    const { data } = await supabase.from("direct_messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (!data) { setChatMessages([]); return; }
    const replyIds = data.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
    const replyMap = new Map<string, { text: string; sender_id: string }>();
    if (replyIds.length > 0) {
      const { data: replies } = await supabase.from("direct_messages").select("id, text, sender_id").in("id", replyIds);
      (replies || []).forEach((r: any) => replyMap.set(r.id, { text: r.text, sender_id: r.sender_id }));
    }
    const allIds = [...new Set([user.id, partnerId, ...Array.from(replyMap.values()).map((r) => r.sender_id)])];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", allIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name || p.username]));
    setChatMessages(data.map((m: any) => {
      const reply = m.reply_to_id ? replyMap.get(m.reply_to_id) : null;
      return { ...m, reply_text: reply?.text, reply_sender_name: reply ? nameMap.get(reply.sender_id) || "Ismeretlen" : undefined };
    }));
  };

  useEffect(() => { fetchConversations(); }, [user]);
  useEffect(() => {
    if (selectedConversation) {
      fetchChatMessages(selectedConversation.recipientId);
      markRead("dm", selectedConversation.recipientId);
    }
  }, [selectedConversation?.recipientId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSearch = async (q: string) => {
    setUserSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, username, display_name, role")
      .or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`).limit(10);
    setSearchResults((data || []).filter((p: any) => p.id !== user?.id) as UserProfile[]);
  };

  const selectUser = (u: UserProfile) => {
    const existing = conversations.find((c) => c.recipientId === u.id);
    if (existing) setSelectedConversation(existing);
    else setSelectedConversation({ id: u.id, name: u.display_name || u.username, lastMsg: "", lastMsgTime: "", recipientId: u.id });
    setUserSearch(""); setSearchResults([]);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation || !user) return;
    await supabase.from("direct_messages").insert({
      sender_id: user.id, receiver_id: selectedConversation.recipientId,
      text: message.trim(), reply_to_id: replyTo?.id || null,
    });
    setMessage(""); setReplyTo(null);
    fetchChatMessages(selectedConversation.recipientId); fetchConversations();
  };

  // Admin messages derived data
  const warningCount = useMemo(() => adminMsgs.filter((m) => m.is_warning).length, [adminMsgs]);
  const suggestionCount = useMemo(() => adminMsgs.filter((m) => m.is_suggestion).length, [adminMsgs]);
  const pointCount = useMemo(() => adminMsgs.filter((m) => m.category === "points" || m.points_delta != null).length, [adminMsgs]);

  const filteredAdmin = useMemo(() => {
    if (adminFilter === "all") return adminMsgs;
    if (adminFilter === "warning") return adminMsgs.filter((m) => m.is_warning);
    if (adminFilter === "suggestion") return adminMsgs.filter((m) => m.is_suggestion);
    if (adminFilter === "points") return adminMsgs.filter((m) => m.category === "points" || m.points_delta != null);
    return adminMsgs;
  }, [adminMsgs, adminFilter]);

  const pointChartData = useMemo(() => {
    // 30-day per-day aggregate of the user's own point changes
    const byDay = new Map<string, { day: string; total: number; plus: number; minus: number }>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { day: key.slice(5), total: 0, plus: 0, minus: 0 });
    }
    for (const m of adminMsgs) {
      if (m.points_delta == null) continue;
      const key = (m.created_at || "").slice(0, 10);
      const row = byDay.get(key);
      if (!row) continue;
      const p = Number(m.points_delta) || 0;
      row.total += p;
      if (p > 0) row.plus += p;
      else if (p < 0) row.minus += Math.abs(p);
    }
    return Array.from(byDay.values());
  }, [adminMsgs]);

  const pointSums = useMemo(() => {
    return pointChartData.reduce(
      (acc, d) => ({ total: acc.total + d.total, plus: acc.plus + d.plus, minus: acc.minus + d.minus }),
      { total: 0, plus: 0, minus: 0 },
    );
  }, [pointChartData]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Üzenetek
          </h1>
        </div>

        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="chats" className="gap-2"><MessageSquare className="w-4 h-4" /> Beszélgetések</TabsTrigger>
            <TabsTrigger value="admin" className="gap-2 relative">
              <Shield className="w-4 h-4" /> Admin üzenetek
              {warningCount > 0 && (
                <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {warningCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* CHATS */}
          <TabsContent value="chats" className="mt-0">
            <div className="grid lg:grid-cols-[300px_1fr] gap-3 sm:gap-4 h-[calc(100dvh-220px)] min-h-[420px]">
              <div className={`bg-card rounded-2xl border border-border overflow-hidden flex-col min-h-0 ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={userSearch} onChange={(e) => handleSearch(e.target.value)} placeholder="Felhasználó keresése..." className="rounded-full pl-9" />
                  </div>
                </div>
                {searchResults.length > 0 && (
                  <div className="border-b border-border">
                    <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Találatok</p>
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => selectUser(u)} className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(u.display_name || u.username).charAt(0)}
                        </div>
                        <div><p className="font-semibold text-sm">{u.display_name || u.username}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p></div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 && searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-semibold text-sm">Nincs beszélgetésed</p>
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <button key={c.id} onClick={() => setSelectedConversation(c)}
                        className={`w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 border-b border-border ${selectedConversation?.id === c.id ? "bg-primary/5" : ""}`}>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">{c.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p></div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={`bg-card rounded-2xl border border-border flex-col min-h-0 overflow-hidden ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
                {selectedConversation ? (
                  <>
                    <div className="p-3 sm:p-4 border-b border-border font-bold flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="rounded-full lg:hidden shrink-0 h-8 w-8" onClick={() => setSelectedConversation(null)}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {selectedConversation.name.charAt(0)}
                      </div>
                      <span className="truncate">{selectedConversation.name}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Még nincs üzenet.</div>
                      ) : (
                        chatMessages.map((m) => {
                          const isOwn = m.sender_id === user?.id;
                          const isSys = !!m.is_system && !isOwn;
                          return (
                            <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                              {isSys && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white shrink-0 mr-2 mt-1">
                                  <Shield className="w-4 h-4" />
                                </div>
                              )}
                              <div className="flex flex-col max-w-[80%] sm:max-w-[70%] min-w-0">
                                {isSys && <span className="text-[11px] font-bold text-primary mb-0.5 flex items-center gap-1"><Shield className="w-3 h-3" /> TanuljVelem Admin</span>}
                                {m.reply_text && (
                                  <div className={`text-xs px-3 py-1.5 rounded-t-xl border-l-2 ${isOwn ? "bg-primary/5 border-primary/40" : "bg-muted/50 border-muted-foreground/30"} mb-0.5`}>
                                    <span className="font-semibold">{m.reply_sender_name}</span>
                                    <p className="truncate opacity-70">{m.reply_text}</p>
                                  </div>
                                )}
                                <div className={`rounded-2xl px-4 py-2.5 break-words ${m.is_warning ? "bg-destructive/10 border-2 border-destructive" : isSys ? "bg-primary/10 border border-primary/30" : isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                  {m.is_warning && (
                                    <div className="flex items-center gap-1.5 text-destructive font-bold text-xs mb-1.5 uppercase"><AlertTriangle className="w-3.5 h-3.5" /> Admin Figyelmeztetés</div>
                                  )}
                                  <div className={`text-sm prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 break-words ${isOwn && !m.is_warning ? "prose-invert" : ""}`}>
                                    <ReactMarkdown>{m.text}</ReactMarkdown>
                                  </div>
                                  <p className={`text-[10px] mt-1 ${isOwn && !m.is_warning ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {new Date(m.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                                <button onClick={() => setReplyTo(m)} className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 self-end">
                                  <Reply className="w-3 h-3" /> Válasz
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    {replyTo && (
                      <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs"><Reply className="w-3.5 h-3.5 text-primary" />
                          <span className="text-muted-foreground">Válasz:</span>
                          <span className="truncate max-w-[200px]">{replyTo.text}</span></div>
                        <button onClick={() => setReplyTo(null)}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    <div className="p-3 sm:p-4 border-t border-border flex gap-2">
                      <Input value={message} onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                        placeholder="Üzenet írása..." className="rounded-full" />
                      <Button size="icon" className="rounded-full bg-primary shrink-0" onClick={handleSend}><Send className="w-4 h-4" /></Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-semibold">Válassz egy beszélgetést</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ADMIN MESSAGES */}
          <TabsContent value="admin" className="mt-0 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <StatCard icon={<Inbox className="w-4 h-4" />} label="Összes" value={adminMsgs.length} color="primary" />
              <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Figyelmeztetés" value={warningCount} color="destructive" />
              <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Pont változás" value={pointCount} color="amber" />
              <StatCard icon={<Lightbulb className="w-4 h-4" />} label="Javaslatok" value={suggestionCount} color="purple" />
            </div>

            {pointChartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" /> Pontok alakulása (admin változtatások)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={pointChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Line type="monotone" dataKey="cum" name="Összesen" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="delta" name="Változás" stroke="hsl(var(--destructive))" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {(["all", "warning", "points", "suggestion"] as const).map((f) => (
                <Button key={f} size="sm" variant={adminFilter === f ? "default" : "outline"}
                  className="rounded-full" onClick={() => setAdminFilter(f)}>
                  {f === "all" ? "Összes" : f === "warning" ? `Figyelmeztetés (${warningCount})` : f === "points" ? `Pontok (${pointCount})` : `Javaslatok (${suggestionCount})`}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredAdmin.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nincs admin üzeneted ebben a kategóriában.</p>
                </div>
              ) : (
                filteredAdmin.map((m) => (
                  <div key={m.id} className={`bg-card border rounded-2xl p-4 ${m.is_warning ? "border-destructive/50 bg-destructive/5" : m.is_suggestion ? "border-purple-500/40" : "border-border"}`}>
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-primary">TanuljVelem Admin</span>
                      {m.is_warning && <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">FIGYELMEZTETÉS</span>}
                      {m.is_suggestion && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold">JAVASLAT</span>}
                      {m.points_delta != null && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.points_delta >= 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-destructive/20 text-destructive"}`}>
                          {m.points_delta > 0 ? "+" : ""}{m.points_delta} pont
                        </span>
                      )}
                      <span className="ml-auto text-muted-foreground">{new Date(m.created_at).toLocaleString("hu-HU")}</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: any = {
    primary: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    purple: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  };
  return (
    <div className={`rounded-2xl border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">{icon}{label}</div>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

export default Messages;
