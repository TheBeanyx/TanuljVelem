import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardNav from "@/components/DashboardNav";

const demoConversations = [
  { id: 1, name: "Kiss Péter", lastMsg: "Köszi a segítséget!", unread: true },
  { id: 2, name: "Nagy Anna", lastMsg: "Holnap találkozunk?", unread: false },
  { id: 3, name: "Kovács Tanár", lastMsg: "A házi feladatot...", unread: true },
];

const demoChat = [
  { id: 1, text: "Szia! Meg tudnád küldeni a matek házi megoldásait?", own: false, time: "14:20" },
  { id: 2, text: "Szia! Persze, melyik feladatokat?", own: true, time: "14:22" },
  { id: 3, text: "A 45-52-ig", own: false, time: "14:23" },
  { id: 4, text: "Köszi a segítséget!", own: false, time: "14:30" },
];

const Messages = () => {
  const [selected, setSelected] = useState(demoConversations[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-120px)]">
          {/* Conversations */}
          <div className="bg-card rounded-2xl border border-border overflow-y-auto">
            <h2 className="font-bold p-4 border-b border-border">Üzenetek</h2>
            {demoConversations.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border ${selected.id === c.id ? "bg-primary/5" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${c.unread ? "" : "text-muted-foreground"}`}>{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                </div>
                {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="bg-card rounded-2xl border border-border flex flex-col">
            <div className="p-4 border-b border-border font-bold">{selected.name}</div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {demoChat.map((m) => (
                <div key={m.id} className={`flex ${m.own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="text-sm">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Üzenet írása..." className="rounded-full" />
              <Button size="icon" className="rounded-full bg-primary shrink-0"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
