import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, Loader2, BookOpen, ClipboardList } from "lucide-react";
import ReactMarkdown from "react-markdown";
import DashboardNav from "@/components/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const max = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    parts.push(tc.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n\n").slice(0, 18000);
}

type Mode = "notes" | "practice";

interface Question {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

const PdfAnalyzer = () => {
  const { user } = useAuth();
  const { award } = useGamification();
  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState(8);
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notes, setNotes] = useState<{ title: string; markdown: string } | null>(null);
  const [test, setTest] = useState<{ title: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast({ title: "Csak PDF-et tölthetsz fel", variant: "destructive" });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "A fájl túl nagy (max 20MB)", variant: "destructive" });
      return;
    }
    setFile(f);
    setNotes(null);
    setTest(null);
    setShowResult(false);
    setAnswers({});
  };

  const run = async (mode: Mode) => {
    if (!file || !user) return;
    setBusy(true);
    setNotes(null);
    setTest(null);
    setShowResult(false);
    try {
      setProgress("PDF szövegének kivonása...");
      const text = await extractPdfText(file);
      if (text.trim().length < 50) {
        toast({ title: "Nem találtam szöveget a PDF-ben", description: "Lehet, hogy szkennelt? OCR még nem támogatott.", variant: "destructive" });
        return;
      }

      setProgress(mode === "notes" ? "Vázlat készítése..." : "Kvíz generálása...");
      const { data, error } = await supabase.functions.invoke("learn-ai", {
        body: {
          mode,
          topic: file.name.replace(/\.pdf$/i, ""),
          grade,
          difficulty: "medium",
          length,
          context: text,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (mode === "notes") {
        setNotes(data.data);
        await supabase.from("learn_notes").insert({
          owner_id: user.id,
          title: data.data.title,
          markdown: data.data.markdown,
          topic: file.name,
          grade,
          length,
          difficulty: "medium",
          source: "pdf",
          visibility: "private",
        });
      } else {
        setTest(data.data);
      }

      await award("pdf_analyzed", { file: file.name, mode });
      toast({ title: "Kész!", description: mode === "notes" ? "Vázlat elkészült és elmentve." : "Kvíz készen áll." });
    } catch (e) {
      console.error(e);
      toast({ title: "Hiba történt", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const submitTest = () => {
    if (!test) return;
    setShowResult(true);
    const correct = test.questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const pct = Math.round((correct / test.questions.length) * 100);
    if (pct === 100) award("perfect_test", { source: "pdf" });
    else award("complete_test", { source: "pdf", percentage: pct });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-4xl font-extrabold mb-2 flex items-center gap-3">
            <FileText className="w-9 h-9 text-primary" />
            PDF Elemző
          </h1>
          <p className="text-muted-foreground">Tölts fel egy PDF-et, és az AI vázlatot vagy kvízt készít belőle.</p>
        </motion.div>

        <Card className="p-6 mb-6">
          <Label className="block mb-2">PDF fájl (max 20MB, max 30 oldal)</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <span className="font-semibold">{file ? file.name : "Kattints vagy húzd ide a PDF-et"}</span>
              {file && <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
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
            <div>
              <Label>Hossz</Label>
              <Select value={length} onValueChange={(v) => setLength(v as typeof length)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Rövid</SelectItem>
                  <SelectItem value="medium">Közepes</SelectItem>
                  <SelectItem value="long">Hosszú</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button disabled={!file || busy} onClick={() => run("notes")} className="flex-1 gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Vázlat készítése
            </Button>
            <Button disabled={!file || busy} onClick={() => run("practice")} variant="secondary" className="flex-1 gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              Kvíz generálás
            </Button>
          </div>
          {progress && <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2"><Sparkles className="w-4 h-4" />{progress}</p>}
        </Card>

        {notes && (
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">{notes.title}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{notes.markdown}</ReactMarkdown>
            </div>
          </Card>
        )}

        {test && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">{test.title}</h2>
            <div className="space-y-6">
              {test.questions.map((q, i) => {
                const userAnswer = answers[i];
                const isCorrect = showResult && userAnswer === q.correct_answer;
                const isWrong = showResult && userAnswer && userAnswer !== q.correct_answer;
                return (
                  <div key={i} className="border border-border rounded-xl p-4">
                    <p className="font-semibold mb-3">{i + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}` as "option_a"];
                        const selected = userAnswer === opt;
                        const correct = showResult && opt === q.correct_answer;
                        return (
                          <button
                            key={opt}
                            disabled={showResult}
                            onClick={() => setAnswers({ ...answers, [i]: opt })}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              correct ? "border-emerald-500 bg-emerald-500/10" :
                              selected && showResult ? "border-red-500 bg-red-500/10" :
                              selected ? "border-primary bg-primary/10" :
                              "border-border hover:border-primary/50"
                            }`}
                          >
                            <span className="font-bold mr-2">{opt}.</span>{text}
                          </button>
                        );
                      })}
                    </div>
                    {showResult && (
                      <p className={`mt-3 text-sm ${isCorrect ? "text-emerald-600" : isWrong ? "text-red-600" : "text-muted-foreground"}`}>
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {!showResult ? (
              <Button onClick={submitTest} disabled={Object.keys(answers).length !== test.questions.length} className="w-full mt-6">
                Beadás
              </Button>
            ) : (
              <div className="mt-6 p-4 bg-primary/10 rounded-xl text-center">
                <p className="text-2xl font-extrabold">
                  {test.questions.filter((q, i) => answers[i] === q.correct_answer).length} / {test.questions.length} pont
                </p>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default PdfAnalyzer;
