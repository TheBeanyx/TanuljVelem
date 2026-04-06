import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageSquare, Send, Search, Users, Reply, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/integrations/supabase/client";

type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
};

type Conversation = {
  id: string;
  name: string;
  lastMsg: string;
  lastMsgTime: string;
  unread: boolean;
  recipientId: string;
};

type ChatMessage = {
  id: string;
  text: string;
  sender_id: string;
  receiver_id: string;
  reply_to_id: string | null;
  created_at: string;
  reply_text?: string;
  reply_sender_name?: string;
};

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const { user } = useAuth();
  const { markRead } = useUnreadCounts();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) { setConversations([]); return; }

    // Group by conversation partner
    const partnerMap = new Map<string, { lastMsg: string; lastTime: string }>();
    for (const msg of data) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, { lastMsg: msg.text, lastTime: msg.created_at });
      }
    }

    const partnerIds = [...partnerMap.keys()];
    if (partnerIds.length === 0) { setConversations([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("id, username, display_name").in("id", partnerIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name || p.username]));

    const convos: Conversation[] = partnerIds.map((pid) => ({
      id: pid,
      name: nameMap.get(pid) || "Ismeretlen",
      lastMsg: partnerMap.get(pid)!.lastMsg,
      lastMsgTime: partnerMap.get(pid)!.lastTime,
      unread: false,
      recipientId: pid,
    }));

    convos.sort((a, b) => new Date(b.lastMsgTime).getTime() - new Date(a.lastMsgTime).getTime());
    setConversations(convos);
  };

  // Fetch chat messages for a conversation
  const fetchChatMessages = async (partnerId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (!data) { setChatMessages([]); return; }

    // Fetch reply references
    const replyIds = data.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
    let replyMap = new Map<string, { text: string; sender_id: string }>();
    if (replyIds.length > 0) {
      const { data: replies } = await supabase.from("direct_messages").select("id, text, sender_id").in("id", replyIds);
      (replies || []).forEach((r: any) => replyMap.set(r.id, { text: r.text, sender_id: r.sender_id }));
    }

    // Get sender names for replies
    const allUserIds = [...new Set([user.id, partnerId, ...Array.from(replyMap.values()).map(r => r.sender_id)])];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", allUserIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name || p.username]));

    setChatMessages(data.map((m: any) => {
      const reply = m.reply_to_id ? replyMap.get(m.reply_to_id) : null;
      return {
        ...m,
        reply_text: reply?.text,
        reply_sender_name: reply ? nameMap.get(reply.sender_id) || "Ismeretlen" : undefined,
      };
    }));
  };

  useEffect(() => { fetchConversations(); }, [user]);

  useEffect(() => {
    if (selectedConversation) fetchChatMessages(selectedConversation.recipientId);
  }, [selectedConversation?.recipientId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSearch = async (query: string) => {
    setUserSearch(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, role")
      .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
      .limit(10);
    setSearchResults((data || []).filter((p: any) => p.id !== user?.id) as UserProfile[]);
  };

  const selectUser = (u: UserProfile) => {
    const existing = conversations.find((c) => c.recipientId === u.id);
    if (existing) {
      setSelectedConversation(existing);
    } else {
      setSelectedConversation({
        id: u.id,
        name: u.display_name || u.username,
        lastMsg: "",
        lastMsgTime: "",
        unread: false,
        recipientId: u.id,
      });
    }
    setUserSearch("");
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation || !user) return;
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: selectedConversation.recipientId,
      text: message.trim(),
      reply_to_id: replyTo?.id || null,
    });
    setMessage("");
    setReplyTo(null);
    fetchChatMessages(selectedConversation.recipientId);
    fetchConversations();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full gap-1">
              <ArrowLeft className="w-4 h-4" /> Vissza
            </Button>
          </Link>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Üzenetek
          </h1>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)] min-h-[400px]">
          {/* Left - Conversations + Search */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Felhasználó keresése..."
                  className="rounded-full pl-9"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="border-b border-border">
                <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Találatok</p>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {(u.display_name || u.username).charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{u.display_name || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username} · {u.role === "teacher" ? "Tanár" : "Diák"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-semibold text-sm">Nincs beszélgetésed</p>
                  <p className="text-xs mt-1">Keress rá egy felhasználóra és kezdj el beszélgetni!</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConversation(c)}
                    className={`w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border ${
                      selectedConversation?.id === c.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right - Chat area */}
          <div className="bg-card rounded-2xl border border-border flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-border font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {selectedConversation.name.charAt(0)}
                  </div>
                  {selectedConversation.name}
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Még nincs üzenet. Írj valamit!
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isOwn = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                          <div className="flex flex-col max-w-[70%]">
                            {m.reply_text && (
                              <div className={`text-xs px-3 py-1.5 rounded-t-xl border-l-2 ${isOwn ? "bg-primary/5 border-primary/40 ml-auto" : "bg-muted/50 border-muted-foreground/30"} mb-0.5`}>
                                <span className="font-semibold">{m.reply_sender_name}</span>
                                <p className="truncate opacity-70">{m.reply_text}</p>
                              </div>
                            )}
                            <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <p className="text-sm">{m.text}</p>
                              <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(m.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <button
                              onClick={() => setReplyTo(m)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 self-end"
                            >
                              <Reply className="w-3 h-3" /> Válasz
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply indicator */}
                {replyTo && (
                  <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Reply className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">Válasz:</span>
                      <span className="truncate max-w-[200px]">{replyTo.text}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                    placeholder="Üzenet írása..."
                    className="rounded-full"
                  />
                  <Button size="icon" className="rounded-full bg-primary shrink-0" onClick={handleSend}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold">Válassz egy beszélgetést</p>
                <p className="text-sm mt-1">Vagy keress rá egy felhasználóra a bal oldali keresővel</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
