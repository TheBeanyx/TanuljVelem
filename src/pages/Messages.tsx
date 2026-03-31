import { useState } from "react";
import { ArrowLeft, MessageSquare, Send, Search, Megaphone, ImagePlus, Users, Star, Weight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardNav from "@/components/DashboardNav";

type Conversation = {
  id: number;
  name: string;
  lastMsg: string;
  unread: boolean;
};

type ChatMessage = {
  id: number;
  text: string;
  own: boolean;
  time: string;
};

type Announcement = {
  id: number;
  sender: string;
  subject: string;
  message: string;
  grade?: string;
  weight?: string;
  imageUrl?: string;
  date: string;
};

const Messages = () => {
  const [conversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Announcements state
  const [announcements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    subject: "",
    message: "",
    grade: "",
    weight: "",
  });
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

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
            <MessageSquare className="w-6 h-6 text-primary" /> Üzenetek & Közlemények
          </h1>
        </div>

        <Tabs defaultValue="messages">
          <TabsList className="rounded-full bg-muted p-1 mb-6">
            <TabsTrigger value="messages" className="rounded-full gap-1.5">
              <MessageSquare className="w-4 h-4" /> Üzenetek
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-full gap-1.5">
              <Megaphone className="w-4 h-4" /> Közlemények
            </TabsTrigger>
          </TabsList>

          {/* === MESSAGES TAB === */}
          <TabsContent value="messages">
            <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-250px)] min-h-[400px]">
              {/* Left - Conversations + Search */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Felhasználó keresése..."
                      className="rounded-full pl-9"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
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
          </TabsContent>

          {/* === ANNOUNCEMENTS TAB === */}
          <TabsContent value="announcements">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* New announcement form */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <button
                  onClick={() => setShowNewAnnouncement(!showNewAnnouncement)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Új közlemény írása...
                  </p>
                </button>

                {showNewAnnouncement && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div>
                      <Label>Tantárgy</Label>
                      <Input
                        value={newAnnouncement.subject}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, subject: e.target.value })}
                        placeholder="pl. Matematika"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Üzenet</Label>
                      <Textarea
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                        placeholder="Írj egy közleményt..."
                        className="mt-1.5 rounded-xl min-h-[100px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Jegy (opcionális)</Label>
                        <Select
                          value={newAnnouncement.grade}
                          onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, grade: v })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="Válassz jegyet" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 - Jeles</SelectItem>
                            <SelectItem value="4">4 - Jó</SelectItem>
                            <SelectItem value="3">3 - Közepes</SelectItem>
                            <SelectItem value="2">2 - Elégséges</SelectItem>
                            <SelectItem value="1">1 - Elégtelen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Súlyozás (opcionális)</Label>
                        <Select
                          value={newAnnouncement.weight}
                          onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, weight: v })}
                        >
                          <SelectTrigger className="mt-1.5 rounded-xl">
                            <SelectValue placeholder="Válassz súlyt" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">100% - Dolgozat</SelectItem>
                            <SelectItem value="50">50% - Röpdolgozat</SelectItem>
                            <SelectItem value="25">25% - Felelet</SelectItem>
                            <SelectItem value="10">10% - Házi feladat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" className="rounded-full gap-2">
                        <ImagePlus className="w-4 h-4" /> Kép csatolása
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setShowNewAnnouncement(false);
                          setNewAnnouncement({ subject: "", message: "", grade: "", weight: "" });
                        }}
                      >
                        Mégse
                      </Button>
                      <Button className="rounded-full bg-primary gap-2">
                        <Send className="w-4 h-4" /> Küldés
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Announcements list */}
              {announcements.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Még nincsenek közlemények</p>
                  <p className="text-sm mt-1">A tanárok itt oszthatnak meg jegyeket, értékeléseket és fontos információkat.</p>
                </div>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {a.sender.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{a.sender}</p>
                        <p className="text-xs text-muted-foreground">{a.date}</p>
                      </div>
                      {a.grade && (
                        <Badge className={`text-sm px-3 py-1 ${
                          Number(a.grade) >= 4 ? "bg-success/10 text-success" :
                          Number(a.grade) === 3 ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          Jegy: {a.grade}
                        </Badge>
                      )}
                    </div>
                    {a.subject && (
                      <Badge variant="outline" className="mb-2">{a.subject}</Badge>
                    )}
                    <p className="text-sm">{a.message}</p>
                    {a.weight && (
                      <p className="text-xs text-muted-foreground mt-2">Súlyozás: {a.weight}%</p>
                    )}
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="Csatolmány" className="mt-3 rounded-xl max-h-48 object-cover" />
                    )}
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

export default Messages;
