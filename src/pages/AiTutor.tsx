import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Send, Sparkles, ClipboardList, Loader2, ArrowRight, User } from "lucide-react";
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

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const SUBJECTS = ["Matematika","Magyar","Történelem","Földrajz","Biológia","Fizika","Kémia","Angol","Német","Informatika","Egyéb"];

const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const AiTutor = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { award } = useGamification();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Szia! 👋 Én vagyok az AI tanárod. Mondj egy **tantárgyat** vagy **témakört**, és elmagyarázom — vagy kérj tőlem egy **gyakorlótesztet**, amit elmentek a Tesztek közé! 📚" },
  ]);
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

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    award("tutor_message");

    try {
      const resp = await fetch(TUTOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) { toast({ title: "Túl sok kérés", description: "Várj egy kicsit és próbáld újra.", variant: "destructive" }); setLoading(false); return; }
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
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
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
        body: {
          mode: "test",
          topic: testTopic,
          subject: testSubject,
          grade: parseInt(testGrade),
          creator_name: profile?.display_name || profile?.username || "AI Tanár",
        },
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
    } finally {
      setGenLoading(false);
    }
  };

  const quickPrompts = [
    "Magyarázd el a Pitagorasz-tételt",
    "Mi a fotoszintézis?",
    "Foglald össze a 2. világháború kezdetét",
    "Mik a szófajok?",
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">AI Tanár</h1>
            <p className="text-sm text-muted-foreground">Magyarázat, kérdés-felelet vagy generált gyakorlóteszt egy helyen.</p>
          </div>
          <Button onClick={() => setGenTestOpen((v) => !v)} className="rounded-full gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <ClipboardList className="w-4 h-4" /> Teszt generálás
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

        <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[420px] overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                }`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
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
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button key={p} onClick={() => setInput(p)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Kérdezz bármit… pl. 'Mi a fotoszintézis?'"
              disabled={loading}
              className="rounded-xl"
            />
            <Button onClick={send} disabled={loading || !input.trim()} className="rounded-xl gap-1">
              <Send className="w-4 h-4" /> Küldés
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AiTutor;
