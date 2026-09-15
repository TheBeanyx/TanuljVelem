import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Upload, Loader2, Sparkles, Save, X } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import RichMarkdown from "@/components/RichMarkdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";

type Mode = "describe" | "solve" | "explain" | "notes" | "text" | "question";

const MODES: { value: Mode; label: string }[] = [
  { value: "describe", label: "Leírás – mi van a képen" },
  { value: "solve", label: "Feladat megoldása lépésenként" },
  { value: "explain", label: "Magyarázat egyszerűen" },
  { value: "notes", label: "Vázlat készítése" },
  { value: "text", label: "Szöveg kiolvasása (átírás)" },
  { value: "question", label: "Saját kérdésem a képről" },
];

const ImageAnalyzer = () => {
  const { user } = useAuth();
  const { award } = useGamification();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("describe");
  const [grade, setGrade] = useState(8);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Csak képet tölthetsz fel", variant: "destructive" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "A kép túl nagy (max 10MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(String(reader.result));
      setFileName(f.name);
      setResult(null);
    };
    reader.readAsDataURL(f);
  };

  const run = async () => {
    if (!dataUrl) return;
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { image: dataUrl, mode, grade, question },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.markdown);
      await award("pdf_analyzed", { mode, file: fileName, kind: "image" });
    } catch (e) {
      toast({
        title: "Hiba történt",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveAsNote = async () => {
    if (!result || !user) return;
    setSaving(true);
    const { error } = await supabase.from("learn_notes").insert({
      owner_id: user.id,
      title: `Képelemzés – ${fileName || "kép"}`,
      markdown: result,
      topic: fileName || "képelemzés",
      grade,
      length: "medium",
      difficulty: "medium",
      source: "image",
      visibility: "private",
    });
    setSaving(false);
    if (error) toast({ title: "Nem sikerült elmenteni", description: error.message, variant: "destructive" });
    else toast({ title: "Elmentve a jegyzetek közé" });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 flex items-center gap-3">
            <ImageIcon className="w-8 h-8 sm:w-9 sm:h-9 text-primary" />
            Kép Elemző
          </h1>
          <p className="text-muted-foreground">
            Tölts fel egy fotót a tankönyvről, jegyzetről vagy feladatról, és az AI elemzi.
          </p>
        </motion.div>

        <Card className="p-4 sm:p-6 mb-6">
          <Label className="block mb-2">Kép (max 10MB)</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="image-upload"
            />
            {dataUrl ? (
              <div className="space-y-3">
                <img src={dataUrl} alt={fileName || "feltöltött kép"} className="max-h-72 mx-auto rounded-lg object-contain" />
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                    Másik kép
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDataUrl(null);
                      setResult(null);
                      setFileName("");
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Törlés
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-muted-foreground" />
                <span className="font-semibold">Kattints vagy húzd ide a képet</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP, HEIC</span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Mit tegyen az AI?</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Évfolyam</Label>
              <Select value={String(grade)} onValueChange={(v) => setGrade(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <SelectItem key={g} value={String(g)}>{g}. osztály</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "question" && (
            <div className="mt-4">
              <Label>Kérdésed a képről</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pl. Miért ez a helyes megoldás a 3. feladatban?"
              />
            </div>
          )}

          <Button disabled={!dataUrl || busy} onClick={run} className="w-full mt-6 gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Elemzés folyamatban..." : "Kép elemzése"}
          </Button>
        </Card>

        {result && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Elemzés</h2>
              <Button variant="secondary" size="sm" onClick={saveAsNote} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Mentés jegyzetként
              </Button>
            </div>
            <RichMarkdown content={result} />
          </Card>
        )}
      </main>
    </div>
  );
};

export default ImageAnalyzer;
