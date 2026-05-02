import { useState } from "react";
import { Brain, Sparkles, Loader2, ChevronLeft, ChevronRight, RotateCcw, NotebookPen, ClipboardList, ArrowLeft, Check, X } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Flashcard = { front: string; back: string; emoji: string };
type Question = {
  question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
};

type View = "input" | "cards" | "done" | "notes" | "practice";

const Learn = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [view, setView] = useState<View>("input");
  const [loading, setLoading] = useState<null | "flashcards" | "notes" | "practice">(null);

  const [topicTitle, setTopicTitle] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [notes, setNotes] = useState<{ title: string; markdown: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [practiceTitle, setPracticeTitle] = useState("");
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [showResults, setShowResults] = useState(false);

  const callAI = async (mode: "flashcards" | "notes" | "practice") => {
    setLoading(mode);
    try {
      const context = cards.length
        ? cards.map((c) => `- ${c.front}: ${c.back}`).join("\n")
        : undefined;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learn-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode, topic, context }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Hiba történt");
      }
      const json = await resp.json();
      return json.data;
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(null);
    }
  };

  const generateCards = async () => {
    if (topic.trim().length < 3) {
      toast({ title: "Adj meg egy témát (legalább 3 karakter)", variant: "destructive" });
      return;
    }
    const data = await callAI("flashcards");
    if (!data) return;
    setTopicTitle(data.topic_title || topic);
    setCards(data.cards || []);
    setCardIdx(0);
    setFlipped(false);
    setView("cards");
  };

  const generateNotes = async () => {
    const data = await callAI("notes");
    if (!data) return;
    setNotes(data);
    setView("notes");
  };

  const generatePractice = async () => {
    const data = await callAI("practice");
    if (!data) return;
    setPracticeTitle(data.title);
    setQuestions(data.questions || []);
    setAnswers({});
    setShowResults(false);
    setView("practice");
  };

  const reset = () => {
    setTopic("");
    setView("input");
    setCards([]);
    setCardIdx(0);
    setFlipped(false);
    setNotes(null);
    setQuestions([]);
    setAnswers({});
    setShowResults(false);
  };

  const next = () => {
    if (cardIdx + 1 >= cards.length) {
      setView("done");
      return;
    }
    setFlipped(false);
    setTimeout(() => setCardIdx((i) => i + 1), 150);
  };

  const prev = () => {
    if (cardIdx === 0) return;
    setFlipped(false);
    setTimeout(() => setCardIdx((i) => i - 1), 150);
  };

  const score = questions.reduce(
    (s, q, i) => (answers[i] === q.correct_answer ? s + 1 : s),
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Tanulás</h1>
            <p className="text-sm text-muted-foreground">AI által generált 3D flashcardok, jegyzetek és gyakorlótesztek</p>
          </div>
        </div>

        {/* INPUT */}
        {view === "input" && (
          <div className="bg-card rounded-3xl border border-border p-8 mt-6 animate-fade-in">
            <Label className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-chart-4" /> Miről szeretnél tanulni?
            </Label>
            <Input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") generateCards(); }}
              placeholder="pl. Fotoszintézis, Pitagorasz-tétel, Második világháború okai..."
              className="mt-2 rounded-xl text-base h-12"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Az AI 8-10 db 3D flashcardot készít a témából. Miután átnézted, kérhetsz jegyzetet vagy gyakorlótesztet is.
            </p>
            <Button
              onClick={generateCards}
              disabled={loading !== null}
              className="w-full mt-5 rounded-xl gradient-primary text-primary-foreground font-bold text-base py-6 gap-2"
            >
              {loading === "flashcards" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading === "flashcards" ? "Flashcardok generálása..." : "Flashcardok készítése"}
            </Button>
          </div>
        )}

        {/* CARDS */}
        {view === "cards" && cards.length > 0 && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Új téma
              </Button>
              <h2 className="font-bold text-lg text-center flex-1">{topicTitle}</h2>
              <span className="text-sm font-semibold text-muted-foreground">
                {cardIdx + 1} / {cards.length}
              </span>
            </div>

            {/* progress */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
              <div
                className="h-full gradient-primary transition-all duration-500"
                style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
              />
            </div>

            {/* 3D flip card */}
            <div
              className="perspective-1200 cursor-pointer select-none"
              onClick={() => setFlipped((f) => !f)}
            >
              <div
                className={`relative preserve-3d transition-transform duration-700 ease-out`}
                style={{
                  height: "min(60vh, 420px)",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* FRONT */}
                <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-chart-4/10 border-2 border-primary/30 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-7xl mb-6">{cards[cardIdx].emoji}</div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-3">{cards[cardIdx].front}</h3>
                  <p className="text-xs text-muted-foreground mt-auto">Kattints a kártyára a megfordításhoz 🔄</p>
                </div>
                {/* BACK */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-chart-4/15 via-card to-primary/15 border-2 border-chart-4/40 shadow-xl flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-base sm:text-lg leading-relaxed">{cards[cardIdx].back}</p>
                  <p className="text-xs text-muted-foreground mt-auto pt-4">Kattints újra a visszafordításhoz</p>
                </div>
              </div>
            </div>

            {/* nav */}
            <div className="flex items-center justify-between gap-3 mt-6">
              <Button variant="outline" onClick={prev} disabled={cardIdx === 0} className="rounded-xl gap-1">
                <ChevronLeft className="w-4 h-4" /> Előző
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)} className="gap-1">
                <RotateCcw className="w-4 h-4" /> Megfordít
              </Button>
              <Button onClick={next} className="rounded-xl gap-1 gradient-primary text-primary-foreground">
                {cardIdx + 1 >= cards.length ? "Kész" : "Következő"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* DONE → ask for notes or practice */}
        {view === "done" && (
          <div className="mt-6 bg-card rounded-3xl border border-border p-8 text-center animate-fade-in">
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-2xl font-black mb-1">Szuper, végignézted!</h2>
            <p className="text-muted-foreground mb-6">Mit szeretnél most csinálni?</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button
                onClick={generateNotes}
                disabled={loading !== null}
                variant="outline"
                className="rounded-2xl py-8 flex-col gap-2 h-auto border-2 hover:border-primary/40 hover:bg-primary/5"
              >
                {loading === "notes" ? <Loader2 className="w-6 h-6 animate-spin" /> : <NotebookPen className="w-7 h-7 text-primary" />}
                <span className="font-bold">Kérj jegyzetet</span>
                <span className="text-xs text-muted-foreground font-normal">Strukturált összefoglaló</span>
              </Button>
              <Button
                onClick={generatePractice}
                disabled={loading !== null}
                variant="outline"
                className="rounded-2xl py-8 flex-col gap-2 h-auto border-2 hover:border-chart-4/40 hover:bg-chart-4/5"
              >
                {loading === "practice" ? <Loader2 className="w-6 h-6 animate-spin" /> : <ClipboardList className="w-7 h-7 text-chart-4" />}
                <span className="font-bold">Gyakorlódolgozat</span>
                <span className="text-xs text-muted-foreground font-normal">5-8 kérdés a témából</span>
              </Button>
            </div>
            <Button variant="ghost" onClick={() => { setCardIdx(0); setView("cards"); }} className="mt-4 gap-1">
              <RotateCcw className="w-4 h-4" /> Újra végig a kártyákat
            </Button>
            <Button variant="ghost" onClick={reset} className="mt-2 ml-2 text-muted-foreground">
              Új téma
            </Button>
          </div>
        )}

        {/* NOTES */}
        {view === "notes" && notes && (
          <div className="mt-6 bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("done")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={generatePractice} disabled={loading !== null} className="rounded-xl gap-1">
                  {loading === "practice" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  Gyakorlódolgozat
                </Button>
              </div>
            </div>
            <h2 className="text-2xl font-black mb-4">{notes.title}</h2>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown>{notes.markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* PRACTICE */}
        {view === "practice" && questions.length > 0 && (
          <div className="mt-6 bg-card rounded-3xl border border-border p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setView("done")} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Vissza
              </Button>
              {showResults && (
                <div className="text-sm font-bold">
                  Eredmény: <span className="text-primary">{score}/{questions.length}</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black mb-6">{practiceTitle}</h2>

            <div className="space-y-6">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const opts: Array<["A" | "B" | "C" | "D", string]> = [
                  ["A", q.option_a], ["B", q.option_b], ["C", q.option_c], ["D", q.option_d],
                ];
                return (
                  <div key={i} className="border border-border rounded-2xl p-4">
                    <p className="font-bold mb-3">{i + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {opts.map(([letter, text]) => {
                        const isUser = userAns === letter;
                        const isCorrect = q.correct_answer === letter;
                        let cls = "border-border bg-background hover:border-primary/40";
                        if (showResults) {
                          if (isCorrect) cls = "border-green-500 bg-green-500/10";
                          else if (isUser) cls = "border-destructive bg-destructive/10";
                        } else if (isUser) {
                          cls = "border-primary bg-primary/10";
                        }
                        return (
                          <button
                            key={letter}
                            type="button"
                            disabled={showResults}
                            onClick={() => setAnswers((a) => ({ ...a, [i]: letter }))}
                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm ${cls}`}
                          >
                            <span className="font-bold w-6">{letter}.</span>
                            <span className="flex-1">{text}</span>
                            {showResults && isCorrect && <Check className="w-4 h-4 text-green-600" />}
                            {showResults && isUser && !isCorrect && <X className="w-4 h-4 text-destructive" />}
                          </button>
                        );
                      })}
                    </div>
                    {showResults && (
                      <p className="text-xs text-muted-foreground mt-3 italic">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {!showResults ? (
              <Button
                onClick={() => setShowResults(true)}
                disabled={Object.keys(answers).length < questions.length}
                className="w-full mt-6 rounded-xl gradient-primary text-primary-foreground font-bold py-6"
              >
                Beadom ({Object.keys(answers).length}/{questions.length})
              </Button>
            ) : (
              <Button onClick={() => { setAnswers({}); setShowResults(false); }} variant="outline" className="w-full mt-6 rounded-xl gap-2">
                <RotateCcw className="w-4 h-4" /> Újra
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Learn;
