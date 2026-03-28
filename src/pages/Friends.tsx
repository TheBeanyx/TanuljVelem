import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Search, UserPlus, MessageSquare, X, Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";

const demoFriends = [
  { id: 1, name: "Kiss Péter", username: "kisspeti", role: "Diák", classmate: true },
  { id: 2, name: "Nagy Anna", username: "nagya", role: "Diák", classmate: true },
  { id: 3, name: "Tóth Gábor", username: "tothg", role: "Diák", classmate: false },
];

const demoRequests = {
  incoming: [{ id: 4, name: "Varga Lili", username: "vargal", role: "Diák" }],
  outgoing: [{ id: 5, name: "Fehér Márk", username: "feherm", role: "Diák" }],
};

const demoClassmates = [
  { id: 6, name: "Molnár Zoli", className: "8.A Matematika", isFriend: false },
  { id: 7, name: "Kiss Péter", className: "8.A Matematika", isFriend: true },
];

const Friends = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-success" /> Barátok</h1>
        </div>

        {/* Search */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <h3 className="font-bold mb-3">Barát keresése</h3>
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Felhasználónév keresése..." className="rounded-full" />
            <Button className="rounded-full gap-2 bg-primary"><Search className="w-4 h-4" /> Keresés</Button>
          </div>
        </div>

        <Tabs defaultValue="friends">
          <TabsList className="rounded-full bg-muted p-1 mb-6">
            <TabsTrigger value="friends" className="rounded-full">Barátaim ({demoFriends.length})</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-full">Kérések</TabsTrigger>
            <TabsTrigger value="classmates" className="rounded-full">Osztálytársak ({demoClassmates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoFriends.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-4 hover:shadow-lg transition-shadow group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {f.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{f.name}</p>
                      <p className="text-xs text-muted-foreground">@{f.username} · {f.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {f.classmate && <Badge variant="outline" className="text-xs bg-primary/5">Osztálytárs</Badge>}
                    <div className="flex gap-1 ml-auto">
                      <Link to="/messages"><Button variant="ghost" size="icon" className="rounded-full w-8 h-8"><MessageSquare className="w-4 h-4" /></Button></Link>
                      <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-3">Beérkezett kérések</h3>
                {demoRequests.incoming.map((r) => (
                  <div key={r.id} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success font-bold">{r.name.charAt(0)}</div>
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">@{r.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-full bg-success hover:bg-success/90 text-success-foreground gap-1"><Check className="w-3 h-3" /> Elfogad</Button>
                      <Button size="sm" variant="ghost" className="rounded-full text-destructive"><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-bold mb-3">Elküldött kérések</h3>
                {demoRequests.outgoing.map((r) => (
                  <div key={r.id} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning font-bold">{r.name.charAt(0)}</div>
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Várakozik...</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full">Visszavon</Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="classmates">
            <div className="space-y-3">
              {demoClassmates.map((c) => (
                <div key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{c.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.className}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/messages"><Button variant="ghost" size="icon" className="rounded-full"><MessageSquare className="w-4 h-4" /></Button></Link>
                    {c.isFriend ? <Badge className="bg-success/10 text-success">Barát</Badge> : <Button size="sm" className="rounded-full gap-1 bg-primary"><UserPlus className="w-3 h-3" /> Hozzáadás</Button>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Friends;
