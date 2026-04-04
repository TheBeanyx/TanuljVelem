import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Box, Brain, Play, X, Gamepad2, Sparkles, Loader2, Trash2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";

const typeIcons: Record<string, typeof Globe> = { browser: Globe, "3d": Box, logic: Brain, ai: Sparkles };
const typeColors: Record<string, string> = {
  browser: "bg-primary text-primary-foreground",
  "3d": "bg-secondary text-secondary-foreground",
  logic: "bg-accent text-accent-foreground",
  ai: "bg-chart-4 text-primary-foreground",
};
const typeLabels: Record<string, string> = { browser: "Browser", "3d": "3D", logic: "Logikai", ai: "AI Generált" };

const Games = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiSubject, setAiSubject] = useState("Matematika");
  const [aiGrade, setAiGrade] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState("Közepes");
  const [generating, setGenerating] = useState(false);
  const [aiGames, setAiGames] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAiGames();
  }, []);

  const fetchAiGames = async () => {
    const { data } = await supabase
      .from("ai_games")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAiGames(data);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-game", {
        body: { prompt, subject: aiSubject, grade: Number(aiGrade), difficulty: aiDifficulty },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const title = data.title || "AI Játék";
      const { error: insertError } = await supabase.from("ai_games").insert({
        title,
        description: prompt,
        subject: aiSubject,
        grade: Number(aiGrade),
        difficulty: aiDifficulty,
        html_code: data.html,
        creator_id: user?.id,
      });
      if (insertError) throw insertError;

      toast({ title: "Játék elkészült!", description: `"${title}" sikeresen létrehozva.` });
      setPrompt("");
      setCreateOpen(false);
      fetchAiGames();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message || "Nem sikerült a játék generálása.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ai_games").delete().eq("id", id);
    fetchAiGames();
    toast({ title: "Törölve" });
  };

  const openPlayer = (html: string, title: string) => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.title = title;
      win.document.close();
    }
  };

  const allGames = aiGames.map((g) => ({
    id: g.id,
    title: g.title,
    desc: g.description,
    type: "ai" as const,
    subject: g.subject,
    grade: g.grade,
    difficulty: g.difficulty,
    html: g.html_code,
    creatorId: g.creator_id,
  }));

  const filtered = allGames.filter((g) => {
    if (typeFilter !== "all" && g.type !== typeFilter) return false;
    if (subjectFilter !== "all" && g.subject !== subjectFilter) return false;
    if (gradeFilter !== "all" && g.grade !== Number(gradeFilter)) return false;
    return true;
  });

  const hasFilter = typeFilter !== "all" || subjectFilter !== "all" || gradeFilter !== "all";

  const subjects = [...new Set(allGames.map((g) => g.subject))];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <section className="gradient-hero py-12 px-6">
        <div className="container mx-auto text-center">
          <Gamepad2 className="w-12 h-12 text-primary-foreground/50 mx-auto mb-3" />
          <h1 className="text-4xl font-black text-primary-foreground">Tanulós Játékok</h1>
          <p className="text-primary-foreground/70 mt-2">Válassz a kedvenc játékaid közül!</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-4 rounded-full gap-2 bg-card text-foreground hover:bg-card/90 shadow-lg">
            <GraduationCap className="w-4 h-4" />
            <Sparkles className="w-4 h-4 text-chart-4" />
            CREATE
          </Button>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sticky top-[65px] z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2 bg-chart-4 hover:bg-chart-4/90 text-primary-foreground">
            <GraduationCap className="w-4 h-4" />
            <Sparkles className="w-4 h-4" />
            CREATE
          </Button>
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
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
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
        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Még nincs játék. Kattints a <strong>CREATE</strong> gombra és generálj egyet AI-val!</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game, i) => {
            const Icon = typeIcons[game.type] || Sparkles;
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-chart-4/20 to-primary/20 flex items-center justify-center relative">
                  <Icon className="w-16 h-16 text-chart-4/30 group-hover:scale-110 transition-transform" />
                  <Badge className={`absolute top-3 left-3 ${typeColors[game.type] || typeColors.ai}`}>{typeLabels[game.type] || "AI"}</Badge>
                  <Badge className="absolute top-3 right-3 bg-card text-foreground">{game.grade}. oszt.</Badge>
                </div>
                <div className="p-5">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{game.subject}</Badge>
                    <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
                  </div>
                  <h3 className="font-bold text-lg">{game.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{game.desc}</p>
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1 rounded-full gap-2 bg-primary hover:bg-primary/90" onClick={() => openPlayer(game.html, game.title)}>
                      <Play className="w-4 h-4" /> Játék
                    </Button>
                    {user?.id === game.creatorId && (
                      <Button variant="outline" size="icon" className="rounded-full" onClick={() => handleDelete(game.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* CREATE Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              <Sparkles className="w-5 h-5 text-chart-4" />
              AI Játék Készítő
            </DialogTitle>
            <DialogDescription>Írd le milyen játékot szeretnél és az AI elkészíti neked!</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Pl.: Szorzótábla gyakorló játék ahol egyre nehezebb feladatok jönnek és az idő fogy..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={generating}
            />
            <div className="grid grid-cols-3 gap-3">
              <Select value={aiSubject} onValueChange={setAiSubject}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Matematika", "Magyar", "Történelem", "Fizika", "Angol", "Biológia", "Kémia", "Földrajz", "Informatika"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aiGrade} onValueChange={setAiGrade}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}. osztály</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Könnyű", "Közepes", "Nehéz"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="w-full rounded-full gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generálás... (ez eltarthat 15-30 mp)</> : <><Sparkles className="w-4 h-4" /> Játék Generálása</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Games;
