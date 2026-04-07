import { useState, useEffect, useRef } from "react";
import { Settings, Save, MessageCircleQuestion, Send, Bot, Loader2, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUPPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user") || '{"username":"Demo","displayName":"Demo","role":"student"}');
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [grade, setGrade] = useState("8");
  const [notifHomework, setNotifHomework] = useState(true);
  const [notifTests, setNotifTests] = useState(true);
  const [notifGames, setNotifGames] = useState(false);
  const [notifResults, setNotifResults] = useState(true);
  const [autoDeleteExpired, setAutoDeleteExpired] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Support chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("setting_value")
        .eq("setting_key", "auto_delete_expired_homework")
        .single();
      if (data) setAutoDeleteExpired(data.setting_value === "true");
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    localStorage.setItem("user", JSON.stringify({ ...user, displayName }));

    const { error } = await supabase
      .from("user_settings")
      .update({ setting_value: autoDeleteExpired ? "true" : "false" })
      .eq("setting_key", "auto_delete_expired_homework");

    if (error) {
      toast({ title: "Hiba a mentésnél", variant: "destructive" });
      return;
    }
    toast({ title: "Beállítások mentve!" });
  };

  const sendSupport = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(SUPPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Hiba történt");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      upsertAssistant(`\n\n⚠️ ${e.message || "Hiba történt"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-8">
          <Settings className="w-6 h-6 text-primary" /> Profil Beállítások
        </h1>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="settings" className="flex-1 gap-2">
              <Settings className="w-4 h-4" /> Beállítások
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex-1 gap-2">
              <MessageCircleQuestion className="w-4 h-4" /> Kapcsolat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                  {(displayName || user.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{user.username}</p>
                  <p className="text-sm text-muted-foreground">{user.role === "teacher" ? "Tanár" : "Diák"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="font-semibold">Megjelenített név</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 rounded-xl" />
                </div>
                {user.role === "student" && (
                  <div>
                    <Label className="font-semibold">Évfolyam</Label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}. osztály</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Házi feladat beállítások</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Lejárt házi feladatok automatikus törlése</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Ha bekapcsolod, a lejárt határidejű házi feladatok automatikusan eltűnnek.</p>
                </div>
                <Switch checked={autoDeleteExpired} onCheckedChange={setAutoDeleteExpired} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Értesítési beállítások</h2>
              <div className="space-y-4">
                {[
                  { label: "Házi feladat határidők", value: notifHomework, set: setNotifHomework },
                  { label: "Dolgozatok és tesztek", value: notifTests, set: setNotifTests },
                  { label: "Új játékok", value: notifGames, set: setNotifGames },
                  { label: "Eredmények", value: notifResults, set: setNotifResults },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{n.label}</span>
                    <Switch checked={n.value} onCheckedChange={n.set} />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 font-bold text-lg py-5">
              <Save className="w-5 h-5" /> Beállítások Mentése
            </Button>
          </TabsContent>

          <TabsContent value="contact">
            <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col" style={{ height: "500px" }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
                <MessageCircleQuestion className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-bold text-sm">TanuljVelem Segítő</span>
                  <p className="text-xs text-muted-foreground">Kérdezz az oldal működéséről!</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Szia! 👋 Miben segíthetek?</p>
                    <p className="text-xs mt-1">Kérdezz bármit az oldal működéséről!</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {["Hogyan hozok létre osztályt?", "Hogyan küldök üzenetet?", "Hogyan működnek a tesztek?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); }}
                          className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Írj egy kérdést az oldal működéséről..."
                  rows={1}
                  className="resize-none rounded-xl text-sm min-h-[38px] max-h-[100px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendSupport();
                    }
                  }}
                />
                <Button onClick={sendSupport} disabled={loading || !input.trim()} size="icon" className="rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
