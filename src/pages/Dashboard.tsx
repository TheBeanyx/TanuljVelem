import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Plus, Edit, Trash2, Clock, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";
import { supabase } from "@/integrations/supabase/client";

const subjectColors: Record<string, string> = {
  Matematika: "bg-primary/10 text-primary",
  Magyar: "bg-warning/10 text-warning",
  Történelem: "bg-accent/10 text-accent",
  Fizika: "bg-success/10 text-success",
  Angol: "bg-secondary/10 text-secondary",
  Biológia: "bg-primary/10 text-primary",
  Kémia: "bg-warning/10 text-warning",
  Földrajz: "bg-accent/10 text-accent",
  Informatika: "bg-success/10 text-success",
};

const subjects = ["Matematika", "Magyar", "Történelem", "Fizika", "Angol", "Biológia", "Kémia", "Földrajz", "Informatika"];

type Homework = {
  id: string;
  subject: string;
  title: string;
  description: string | null;
  deadline: string | null;
  created_at: string;
  class_id: string | null;
  creator_id: string | null;
};

type ClassItem = {
  id: string;
  name: string;
};

const demoTests = [
  { id: 1, subject: "Matematika", title: "Félév végi dolgozat", date: "Jún. 20", score: null },
  { id: 2, subject: "Angol", title: "Grammar teszt", date: "Jún. 18", score: "85%" },
];

function getDeadlineInfo(deadline: string | null) {
  if (!deadline) return { label: "Nincs határidő", color: "bg-muted text-muted-foreground" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Lejárt", color: "bg-destructive/10 text-destructive" };
  if (diff === 0) return { label: "Ma esedékes", color: "bg-warning/10 text-warning" };
  if (diff === 1) return { label: "Holnap", color: "bg-primary/10 text-primary" };
  const formatted = d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  return { label: formatted, color: "bg-muted text-muted-foreground" };
}

const Dashboard = () => {
  const [tab, setTab] = useState("homework");
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHw, setEditingHw] = useState<Homework | null>(null);
  const [deletingHw, setDeletingHw] = useState<Homework | null>(null);
  const [formSubject, setFormSubject] = useState("Matematika");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [shareToClass, setShareToClass] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [myClasses, setMyClasses] = useState<ClassItem[]>([]);
  const [autoDeleteExpired, setAutoDeleteExpired] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";

  const fetchMyClasses = async () => {
    if (!user) return;
    // Get classes I own (teacher) or am member of
    const { data: owned } = await supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", user.id);

    const { data: memberships } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", user.id);

    let memberClasses: ClassItem[] = [];
    if (memberships && memberships.length > 0) {
      const classIds = memberships.map((m: any) => m.class_id);
      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);
      memberClasses = (data || []) as ClassItem[];
    }

    const all = [...(owned || []), ...memberClasses];
    // Deduplicate
    const unique = Array.from(new Map(all.map((c) => [c.id, c])).values());
    setMyClasses(unique);
  };

  const fetchHomeworks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("homeworks")
      .select("*")
      .order("deadline", { ascending: true, nullsFirst: false });

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült betölteni a házi feladatokat.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("setting_value")
      .eq("setting_key", "auto_delete_expired_homework")
      .single();

    const autoDelete = settings?.setting_value === "true";
    setAutoDeleteExpired(autoDelete);

    if (autoDelete && data) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expired = data.filter((hw) => {
        if (!hw.deadline) return false;
        const d = new Date(hw.deadline);
        d.setHours(0, 0, 0, 0);
        return d < now;
      });
      if (expired.length > 0) {
        await supabase.from("homeworks").delete().in("id", expired.map((h) => h.id));
        setHomeworks(data.filter((hw) => !expired.find((e) => e.id === hw.id)) as Homework[]);
      } else {
        setHomeworks((data || []) as Homework[]);
      }
    } else {
      setHomeworks((data || []) as Homework[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHomeworks();
    fetchMyClasses();
  }, [user]);

  const openAddDialog = () => {
    setEditingHw(null);
    setFormSubject("Matematika");
    setFormTitle("");
    setFormDesc("");
    setFormDeadline("");
    setShareToClass(false);
    setSelectedClassId("");
    setDialogOpen(true);
  };

  const openEditDialog = (hw: Homework) => {
    setEditingHw(hw);
    setFormSubject(hw.subject);
    setFormTitle(hw.title);
    setFormDesc(hw.description || "");
    setFormDeadline(hw.deadline || "");
    setShareToClass(false);
    setSelectedClassId("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: "A cím kötelező!", variant: "destructive" });
      return;
    }

    const payload: any = {
      subject: formSubject,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      deadline: formDeadline || null,
    };

    if (editingHw) {
      const { error } = await supabase.from("homeworks").update(payload).eq("id", editingHw.id);
      if (error) {
        toast({ title: "Hiba a mentésnél", variant: "destructive" });
        return;
      }
      toast({ title: "Házi feladat frissítve!" });
    } else {
      if (shareToClass && selectedClassId) {
        payload.class_id = selectedClassId;
      }
      payload.creator_id = user?.id || null;

      const { data: inserted, error } = await supabase.from("homeworks").insert(payload).select().single();
      if (error) {
        toast({ title: "Hiba a hozzáadásnál", variant: "destructive" });
        return;
      }

      // If shared to class, post a message in the class chat
      if (shareToClass && selectedClassId && inserted) {
        const displayName = profile?.display_name || profile?.username || "Valaki";
        await supabase.from("class_messages").insert({
          class_id: selectedClassId,
          user_id: user!.id,
          text: `📚 ${displayName} új házit írt fel ${formSubject} tantárgyból: "${formTitle.trim()}"`,
          message_type: "homework",
          homework_id: inserted.id,
        });
      }

      toast({ title: "Házi feladat hozzáadva!" });
    }

    setDialogOpen(false);
    fetchHomeworks();
  };

  const handleDelete = async () => {
    if (!deletingHw) return;
    const { error } = await supabase.from("homeworks").delete().eq("id", deletingHw.id);
    if (error) {
      toast({ title: "Hiba a törlésnél", variant: "destructive" });
      return;
    }
    toast({ title: "Házi feladat törölve!" });
    setDeleteDialogOpen(false);
    setDeletingHw(null);
    fetchHomeworks();
  };

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
                <BookOpen className="w-4 h-4" /> Házi Feladatok ({homeworks.length})
              </TabsTrigger>
              <TabsTrigger value="tests" className="rounded-full gap-2 data-[state=active]:bg-card">
                <FileText className="w-4 h-4" /> Dolgozatok ({demoTests.length})
              </TabsTrigger>
            </TabsList>
            <Button onClick={tab === "homework" ? openAddDialog : undefined} className="rounded-full gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              {tab === "homework" ? "Új Házi" : "Új Dolgozat"}
            </Button>
          </div>

          <TabsContent value="homework">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : homeworks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">Nincsenek házi feladatok</p>
                <p className="text-sm mt-1">Kattints az "Új Házi" gombra egy új hozzáadásához!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {homeworks.map((hw, i) => {
                  const dl = getDeadlineInfo(hw.deadline);
                  return (
                    <motion.div
                      key={hw.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={`${subjectColors[hw.subject] || "bg-muted text-muted-foreground"} font-semibold`}>
                              {hw.subject}
                            </Badge>
                            {hw.class_id && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Share2 className="w-3 h-3" /> Osztály
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-lg">{hw.title}</h3>
                          {hw.description && <p className="text-muted-foreground text-sm mt-1">{hw.description}</p>}
                          <Badge variant="outline" className={`mt-3 ${dl.color} border-0`}>
                            <Clock className="w-3 h-3 mr-1" /> {dl.label}
                          </Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => openEditDialog(hw)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full w-8 h-8 text-destructive"
                            onClick={() => { setDeletingHw(hw); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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

      {/* Add/Edit Homework Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingHw ? "Házi feladat szerkesztése" : "Új házi feladat"}</DialogTitle>
            <DialogDescription>
              {editingHw ? "Módosítsd a házi feladat adatait." : "Add meg az új házi feladat részleteit."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-semibold">Tantárgy</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-semibold">Cím *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="mt-1.5 rounded-xl" placeholder="pl. Másodfokú egyenletek" />
            </div>
            <div>
              <Label className="font-semibold">Leírás</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="mt-1.5 rounded-xl" placeholder="pl. 45-52. feladatok megoldása" />
            </div>
            <div>
              <Label className="font-semibold">Határidő</Label>
              <Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>

            {/* Share to class option */}
            {!editingHw && myClasses.length > 0 && (
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="shareToClass"
                    checked={shareToClass}
                    onCheckedChange={(v) => setShareToClass(v === true)}
                  />
                  <Label htmlFor="shareToClass" className="font-semibold flex items-center gap-2 cursor-pointer">
                    <Share2 className="w-4 h-4" /> Felírás az osztálycsoportba
                  </Label>
                </div>
                {shareToClass && (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Válassz osztályt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {myClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Mégse</Button>
            <Button onClick={handleSave} className="rounded-xl bg-primary hover:bg-primary/90">
              {editingHw ? "Mentés" : "Hozzáadás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Házi feladat törlése</DialogTitle>
            <DialogDescription>Ez a művelet nem vonható vissza.</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">Biztosan törölni szeretnéd a(z) „{deletingHw?.title}" házi feladatot?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Mégse</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Törlés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
