import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Send, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
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
  unread: boolean;
  recipientId: string;
};

type ChatMessage = {
  id: number;
  text: string;
  own: boolean;
  time: string;
};

const Messages = () => {
  const [conversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const { user } = useAuth();

  const handleSearch = async (query: string) => {
    setUserSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, role")
      .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
      .limit(10);
    setSearchResults((data || []).filter((p: any) => p.id !== user?.id) as UserProfile[]);
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

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="border-b border-border">
                <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Találatok</p>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedConversation({
                        id: u.id,
                        name: u.display_name || u.username,
                        lastMsg: "",
                        unread: false,
                        recipientId: u.id,
                      });
                      setUserSearch("");
                      setSearchResults([]);
                    }}
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
                      <p className={`font-semibold text-sm ${c.unread ? "" : "text-muted-foreground"}`}>{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                    </div>
                    {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
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
                    chatMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{m.text}</p>
                          <p className={`text-[10px] mt-1 ${m.own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Üzenet írása..."
                    className="rounded-full"
                  />
                  <Button size="icon" className="rounded-full bg-primary shrink-0">
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
