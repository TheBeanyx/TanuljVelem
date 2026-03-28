import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Plus, Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";

const subjectColors: Record<string, string> = {
  Matematika: "bg-primary/10 text-primary",
  Magyar: "bg-warning/10 text-warning",
  Történelem: "bg-accent/10 text-accent",
  Fizika: "bg-success/10 text-success",
  Angol: "bg-secondary/10 text-secondary",
};

const demoHomeworks = [
  { id: 1, subject: "Matematika", title: "Másodfokú egyenletek", desc: "45-52. feladatok megoldása", deadline: "Lejárt", deadlineColor: "bg-destructive/10 text-destructive" },
  { id: 2, subject: "Magyar", title: "Petőfi verselemzés", desc: "Szeptember végén elemzés", deadline: "Ma esedékes", deadlineColor: "bg-warning/10 text-warning" },
  { id: 3, subject: "Történelem", title: "II. Világháború", desc: "Esszé készítése", deadline: "Holnap", deadlineColor: "bg-primary/10 text-primary" },
  { id: 4, subject: "Fizika", title: "Newton törvényei", desc: "Kísérleti jegyzőkönyv", deadline: "Jún. 15", deadlineColor: "bg-muted text-muted-foreground" },
];

const demoTests = [
  { id: 1, subject: "Matematika", title: "Félév végi dolgozat", date: "Jún. 20", score: null },
  { id: 2, subject: "Angol", title: "Grammar teszt", date: "Jún. 18", score: "85%" },
];

const Dashboard = () => {
  const [tab, setTab] = useState("homework");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black">Irányítópult</h1>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="rounded-full bg-muted p-1">
              <TabsTrigger value="homework" className="rounded-full gap-2 data-[state=active]:bg-card">
                <BookOpen className="w-4 h-4" /> Házi Feladatok ({demoHomeworks.length})
              </TabsTrigger>
              <TabsTrigger value="tests" className="rounded-full gap-2 data-[state=active]:bg-card">
                <FileText className="w-4 h-4" /> Dolgozatok ({demoTests.length})
              </TabsTrigger>
            </TabsList>
            <Button className="rounded-full gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              {tab === "homework" ? "Új Házi" : "Új Dolgozat"}
            </Button>
          </div>

          <TabsContent value="homework">
            <div className="grid md:grid-cols-2 gap-4">
              {demoHomeworks.map((hw, i) => (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge className={`${subjectColors[hw.subject] || "bg-muted text-muted-foreground"} font-semibold mb-3`}>
                        {hw.subject}
                      </Badge>
                      <h3 className="font-bold text-lg">{hw.title}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{hw.desc}</p>
                      <Badge variant="outline" className={`mt-3 ${hw.deadlineColor} border-0`}>
                        <Clock className="w-3 h-3 mr-1" /> {hw.deadline}
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tests">
            <div className="grid md:grid-cols-2 gap-4">
              {demoTests.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow"
                >
                  <Badge className={`${subjectColors[t.subject] || "bg-muted text-muted-foreground"} font-semibold mb-3`}>
                    {t.subject}
                  </Badge>
                  <h3 className="font-bold text-lg">{t.title}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm text-muted-foreground">{t.date}</span>
                    {t.score && <Badge className="bg-success/10 text-success border-0">{t.score}</Badge>}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
