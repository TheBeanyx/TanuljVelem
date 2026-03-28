import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Box, Brain, Play, X, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardNav from "@/components/DashboardNav";

const typeIcons: Record<string, typeof Globe> = { browser: Globe, "3d": Box, logic: Brain };
const typeColors: Record<string, string> = { browser: "bg-primary text-primary-foreground", "3d": "bg-secondary text-secondary-foreground", logic: "bg-accent text-accent-foreground" };
const typeLabels: Record<string, string> = { browser: "Browser", "3d": "3D", logic: "Logikai" };

const demoGames = [
  { id: 1, title: "MatemaTiger", desc: "Fejleszd a szorzás tudásodat", type: "browser", subject: "Matematika", grade: 3, difficulty: "Könnyű" },
  { id: 2, title: "SzóVadász", desc: "Találd meg a rejtett szavakat", type: "logic", subject: "Magyar", grade: 5, difficulty: "Közepes" },
  { id: 3, title: "TörténelemQuest", desc: "Utazz a múltba 3D-ben", type: "3d", subject: "Történelem", grade: 7, difficulty: "Nehéz" },
  { id: 4, title: "FizikaLab", desc: "Virtuális kísérletek", type: "3d", subject: "Fizika", grade: 9, difficulty: "Közepes" },
  { id: 5, title: "AngolMester", desc: "Nyelvtani kalandok", type: "browser", subject: "Angol", grade: 6, difficulty: "Könnyű" },
  { id: 6, title: "LogiKocka", desc: "Térszemlélet fejlesztés", type: "logic", subject: "Matematika", grade: 4, difficulty: "Nehéz" },
];

const Games = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  const filtered = demoGames.filter((g) => {
    if (typeFilter !== "all" && g.type !== typeFilter) return false;
    if (subjectFilter !== "all" && g.subject !== subjectFilter) return false;
    if (gradeFilter !== "all" && g.grade !== Number(gradeFilter)) return false;
    return true;
  });

  const hasFilter = typeFilter !== "all" || subjectFilter !== "all" || gradeFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <section className="gradient-hero py-12 px-6">
        <div className="container mx-auto text-center">
          <Gamepad2 className="w-12 h-12 text-primary-foreground/50 mx-auto mb-3" />
          <h1 className="text-4xl font-black text-primary-foreground">Tanulós Játékok</h1>
          <p className="text-primary-foreground/70 mt-2">Válassz a kedvenc játékaid közül!</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sticky top-[65px] z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px] rounded-full"><SelectValue placeholder="Évfolyam" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes évfolyam</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}. osztály</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[140px] rounded-full"><SelectValue placeholder="Tantárgy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes tantárgy</SelectItem>
              {["Magyar", "Matematika", "Történelem", "Fizika", "Angol"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] rounded-full"><SelectValue placeholder="Játék típus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes típus</SelectItem>
              <SelectItem value="browser">Browser Játékok</SelectItem>
              <SelectItem value="3d">3D Játékok</SelectItem>
              <SelectItem value="logic">Logikai Játékok</SelectItem>
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button variant="ghost" size="sm" className="rounded-full gap-1" onClick={() => { setTypeFilter("all"); setSubjectFilter("all"); setGradeFilter("all"); }}>
              <X className="w-3 h-3" /> Törlés
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} találat</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game, i) => {
            const Icon = typeIcons[game.type];
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative">
                  <Icon className="w-16 h-16 text-primary/30 group-hover:scale-110 transition-transform" />
                  <Badge className={`absolute top-3 left-3 ${typeColors[game.type]}`}>{typeLabels[game.type]}</Badge>
                  <Badge className="absolute top-3 right-3 bg-card text-foreground">{game.grade}. oszt.</Badge>
                </div>
                <div className="p-5">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{game.subject}</Badge>
                    <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
                  </div>
                  <h3 className="font-bold text-lg">{game.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{game.desc}</p>
                  <Button className="mt-4 w-full rounded-full gap-2 bg-primary hover:bg-primary/90">
                    <Play className="w-4 h-4" /> Játék
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Games;
