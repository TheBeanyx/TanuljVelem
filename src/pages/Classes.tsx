import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, UserPlus, Plus, Copy, Crown, MessageSquare, Send, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";

const demoClasses: { id: number; name: string; members: number; grade: number; code: string; owner: boolean }[] = [];

const demoMembers: { id: number; name: string; role: string; isOwner: boolean }[] = [];

const demoMessages: { id: number; sender: string; text: string; time: string; own: boolean }[] = [];

const Classes = () => {
  const [selectedClass, setSelectedClass] = useState<typeof demoClasses[0] | null>(demoClasses[0] || null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2"><UserPlus className="w-4 h-4" /> Csatlakozás</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Csatlakozás osztályhoz</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Osztály kód</Label><Input placeholder="pl. MAT8A1" className="mt-1.5 rounded-xl uppercase" maxLength={6} /></div>
                  <Button className="w-full rounded-xl bg-primary">Csatlakozás</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2 bg-primary"><Plus className="w-4 h-4" /> Új Osztály</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Új osztály létrehozása</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Osztály neve *</Label><Input placeholder="pl. 8.A Matematika" className="mt-1.5 rounded-xl" /></div>
                  <div><Label>Leírás</Label><Input placeholder="Opcionális leírás" className="mt-1.5 rounded-xl" /></div>
                  <div><Label>Évfolyam</Label>
                    <select className="w-full mt-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1}>{i + 1}. osztály</option>)}
                    </select>
                  </div>
                  <Button className="w-full rounded-xl bg-primary">Létrehozás</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Left - Class list */}
          <div className="space-y-3">
            {demoClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedClass.id === c.id ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:shadow-sm"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.members} tag · {c.grade}. évfolyam</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right - Class details */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedClass.members} tag · {selectedClass.grade}. évfolyam</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => { navigator.clipboard.writeText(selectedClass.code); toast({ title: "Kód másolva!" }); }}>
                  <Copy className="w-3 h-3" /> {selectedClass.code}
                </Badge>
                <Button variant="ghost" size="icon" className="rounded-full text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>

            <Tabs defaultValue="chat">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-5 pt-2">
                <TabsTrigger value="chat" className="rounded-t-lg">Chat</TabsTrigger>
                <TabsTrigger value="members" className="rounded-t-lg">Tagok</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="p-0">
                <div className="h-[400px] flex flex-col">
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {demoMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {!m.own && <p className="text-xs font-semibold mb-1 opacity-70">{m.sender}</p>}
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
              </TabsContent>

              <TabsContent value="members" className="p-5">
                <div className="space-y-3">
                  {demoMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            {m.name} {m.isOwner && <Crown className="w-3.5 h-3.5 text-warning" />}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.role === "teacher" ? "Tanár" : "Diák"}</p>
                        </div>
                      </div>
                      {!m.isOwner && (
                        <Button variant="ghost" size="icon" className="rounded-full"><MessageSquare className="w-4 h-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Classes;
