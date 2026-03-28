import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Clock, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";

const demoTests = [
  { id: 1, subject: "Matematika", title: "Algebrai kifejezések", questions: 15, time: "30 perc", creator: "Kovács Tanár", grade: 8 },
  { id: 2, subject: "Magyar", title: "Helyesírás gyakorló", questions: 20, time: "25 perc", creator: "Nagy Tanárnő", grade: 6 },
  { id: 3, subject: "Történelem", title: "Honfoglalás kora", questions: 10, time: "20 perc", creator: "Szabó Tanár", grade: 7 },
];

const demoResults = [
  { id: 1, test: "Törtek és tizedesek", date: "2024-06-10", score: "18/20", percent: 90 },
  { id: 2, test: "Igeidők – Angol", date: "2024-06-08", score: "12/15", percent: 80 },
  { id: 3, test: "Kémiai elemek", date: "2024-06-05", score: "7/20", percent: 35 },
];

const percentColor = (p: number) => p >= 70 ? "text-success" : p >= 50 ? "text-warning" : "text-destructive";

const Tests = () => {
  const [tab, setTab] = useState("available");
  const user = JSON.parse(localStorage.getItem("user") || '{"role":"student"}');

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <section className="gradient-success py-12 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-center flex-1">
            <BookOpen className="w-12 h-12 text-success-foreground/50 mx-auto mb-3" />
            <h1 className="text-4xl font-black text-success-foreground">Gyakorló Tesztek</h1>
            <p className="text-success-foreground/70 mt-2">Készülj a dolgozatokra!</p>
          </div>
          {user.role === "teacher" && (
            <Button className="bg-card text-foreground hover:bg-card/90 rounded-full gap-2 font-bold">
              <Plus className="w-4 h-4" /> Új Teszt
            </Button>
          )}
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-full bg-muted p-1 mb-6">
            <TabsTrigger value="available" className="rounded-full">Elérhető Tesztek</TabsTrigger>
            <TabsTrigger value="results" className="rounded-full">Eredményeim</TabsTrigger>
            {user.role === "teacher" && <TabsTrigger value="own" className="rounded-full">Saját Tesztjeim</TabsTrigger>}
          </TabsList>

          <TabsContent value="available">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {demoTests.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary/10 text-primary">{t.subject}</Badge>
                    <Badge variant="outline" className="text-xs">{t.grade}. oszt.</Badge>
                  </div>
                  <h3 className="font-bold text-lg">{t.title}</h3>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t.questions} kérdés</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.time}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <User className="w-3 h-3" /> {t.creator}
                  </div>
                  <Button className="mt-4 w-full rounded-full bg-success hover:bg-success/90 text-success-foreground">Teszt Kitöltése</Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="space-y-4">
              {demoResults.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{r.test}</h3>
                    <p className="text-sm text-muted-foreground">{r.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{r.score}</p>
                    <p className={`text-lg font-black ${percentColor(r.percent)}`}>{r.percent}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {user.role === "teacher" && (
            <TabsContent value="own">
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Még nem hoztál létre tesztet.</p>
                <Button className="mt-4 rounded-full gap-2 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Új Teszt Létrehozása</Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Tests;
