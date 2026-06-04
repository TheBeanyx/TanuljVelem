import { useEffect, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Library, Plus, FileText, Video, Image as ImageIcon, Link as LinkIcon, Download, Trash2, Globe, Users } from "lucide-react";

type Material = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  grade: number | null;
  type: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  visibility: string;
  class_id: string | null;
  created_at: string;
};

const typeIcon = (t: string, mime?: string | null) => {
  if (t === "link") return <LinkIcon className="w-5 h-5" />;
  if (t === "video" || mime?.startsWith("video/")) return <Video className="w-5 h-5" />;
  if (mime?.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
};

const Materials = () => {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [kind, setKind] = useState<"file" | "link" | "video">("file");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"public" | "class">("public");
  const [classId, setClassId] = useState<string>("");

  const load = async () => {
    const { data } = await supabase
      .from("study_materials")
      .select("*")
      .order("created_at", { ascending: false });
    setMaterials((data as Material[]) || []);
  };

  const loadClasses = async () => {
    if (!user) return;
    const { data } = await supabase.from("classes").select("id, name").eq("owner_id", user.id);
    setClasses(data || []);
  };

  useEffect(() => {
    load();
    if (isTeacher) loadClasses();
  }, [user?.id, isTeacher]);

  const reset = () => {
    setTitle(""); setDescription(""); setSubject(""); setGrade(""); setKind("file");
    setLinkUrl(""); setFile(null); setVisibility("public"); setClassId("");
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast({ title: "Adj meg címet" }); return; }
    if (kind === "file" && !file) { toast({ title: "Válassz fájlt" }); return; }
    if ((kind === "link" || kind === "video") && !linkUrl.trim()) { toast({ title: "Adj meg URL-t" }); return; }
    if (visibility === "class" && !classId) { toast({ title: "Válassz osztályt" }); return; }

    setLoading(true);
    try {
      let storage_path: string | null = null;
      let url: string | null = null;
      let file_name: string | null = null;
      let mime_type: string | null = null;
      let file_size: number | null = null;

      if (kind === "file" && file) {
        const path = `${user.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("study-materials")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        storage_path = path;
        file_name = file.name;
        mime_type = file.type;
        file_size = file.size;
      } else {
        url = linkUrl.trim();
      }

      const { error } = await supabase.from("study_materials").insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade: grade ? parseInt(grade) : null,
        type: kind,
        url,
        storage_path,
        file_name,
        mime_type,
        file_size,
        visibility: visibility === "class" ? "class" : "public",
        class_id: visibility === "class" ? classId : null,
      });
      if (error) throw error;

      toast({ title: "Tananyag megosztva" });
      setOpen(false);
      reset();
      load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openMaterial = async (m: Material) => {
    if (m.url) {
      window.open(m.url, "_blank");
      return;
    }
    if (m.storage_path) {
      const { data, error } = await supabase.storage
        .from("study-materials")
        .createSignedUrl(m.storage_path, 60 * 60);
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      window.open(data.signedUrl, "_blank");
    }
  };

  const remove = async (m: Material) => {
    if (!confirm("Biztosan törlöd?")) return;
    if (m.storage_path) {
      await supabase.storage.from("study-materials").remove([m.storage_path]);
    }
    await supabase.from("study_materials").delete().eq("id", m.id);
    load();
  };

  const mine = materials.filter((m) => m.owner_id === user?.id);
  const shared = materials.filter((m) => m.owner_id !== user?.id);

  const renderCard = (m: Material) => (
    <Card key={m.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {typeIcon(m.type, m.mime_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold truncate">{m.title}</h3>
            {m.visibility === "public" ? (
              <Badge variant="secondary" className="gap-1"><Globe className="w-3 h-3" />Mindenki</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><Users className="w-3 h-3" />Osztály</Badge>
            )}
            {m.subject && <Badge variant="outline">{m.subject}</Badge>}
            {m.grade && <Badge variant="outline">{m.grade}. évf.</Badge>}
          </div>
          {m.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => openMaterial(m)} className="gap-1">
              <Download className="w-3 h-3" /> Megnyitás
            </Button>
            {m.owner_id === user?.id && (
              <Button size="sm" variant="ghost" onClick={() => remove(m)} className="text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              <Library className="w-7 h-7 text-primary" /> Tananyag
            </h1>
            <p className="text-muted-foreground">Tankönyvek, videók, képek és linkek megosztása</p>
          </div>
          {isTeacher && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Új tananyag</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Tananyag megosztása</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Cím</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Leírás</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Tantárgy</Label>
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="pl. Matek" />
                    </div>
                    <div>
                      <Label>Évfolyam</Label>
                      <Input type="number" min={1} max={12} value={grade} onChange={(e) => setGrade(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Típus</Label>
                    <Select value={kind} onValueChange={(v: any) => setKind(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file">Fájl (PDF, kép, dokumentum)</SelectItem>
                        <SelectItem value="video">Videó link (pl. YouTube)</SelectItem>
                        <SelectItem value="link">Külső link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {kind === "file" ? (
                    <div>
                      <Label>Fájl</Label>
                      <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </div>
                  ) : (
                    <div>
                      <Label>URL</Label>
                      <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  )}
                  <div>
                    <Label>Láthatóság</Label>
                    <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Mindenki</SelectItem>
                        <SelectItem value="class">Osztály</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {visibility === "class" && (
                    <div>
                      <Label>Osztály</Label>
                      <Select value={classId} onValueChange={setClassId}>
                        <SelectTrigger><SelectValue placeholder="Válassz osztályt" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={loading}>{loading ? "Feltöltés..." : "Megosztás"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Összes ({materials.length})</TabsTrigger>
            <TabsTrigger value="shared">Megosztott ({shared.length})</TabsTrigger>
            {isTeacher && <TabsTrigger value="mine">Saját ({mine.length})</TabsTrigger>}
          </TabsList>
          <TabsContent value="all" className="space-y-2 mt-4">
            {materials.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">
                <Library className="w-12 h-12 mx-auto mb-2 opacity-40" />
                Még nincs megosztott tananyag.
              </CardContent></Card>
            ) : materials.map(renderCard)}
          </TabsContent>
          <TabsContent value="shared" className="space-y-2 mt-4">
            {shared.map(renderCard)}
          </TabsContent>
          {isTeacher && (
            <TabsContent value="mine" className="space-y-2 mt-4">
              {mine.map(renderCard)}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Materials;
