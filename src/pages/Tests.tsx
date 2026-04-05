import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Clock, User, CheckCircle, XCircle, ArrowLeft, ArrowRight, Trophy, X, ToggleLeft, PenLine, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { supabase } from "@/integrations/supabase/client";

const subjectColors: Record<string, string> = {
  Matematika: "bg-primary/10 text-primary",
  Magyar: "bg-warning/10 text-warning",
  Történelem: "bg-accent/10 text-accent",
  Fizika: "bg-success/10 text-success",
  Angol: "bg-secondary/10 text-secondary",
};

const subjects = ["Matematika", "Magyar", "Történelem", "Fizika", "Angol", "Biológia", "Kémia", "Földrajz", "Informatika"];

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "Feleletválasztó",
  true_false: "Igaz/Hamis",
  fill_in: "Kitöltős",
  ordering: "Sorrend",
};

const questionTypeIcons: Record<string, typeof BookOpen> = {
  multiple_choice: BookOpen,
  true_false: ToggleLeft,
  fill_in: PenLine,
  ordering: ListOrdered,
};

type Test = {
  id: string; subject: string; title: string; grade: number;
  time_limit_minutes: number; creator_name: string; is_system: boolean; created_at: string;
};

type Question = {
  id: string; question: string; option_a: string; option_b: string;
  option_c: string; option_d: string; correct_answer: string;
  explanation: string | null; sort_order: number; question_type: string;
};

type TestResult = {
  id: string; test_id: string; score: number; total_questions: number;
  percentage: number; answers: any; completed_at: string;
};

type NewQuestion = {
  question: string; type: string; a: string; b: string; c: string; d: string;
  correct: string; explanation: string;
};

const emptyQuestion = (): NewQuestion => ({
  question: "", type: "multiple_choice", a: "", b: "", c: "", d: "", correct: "A", explanation: "",
});

const percentColor = (p: number) => p >= 70 ? "text-success" : p >= 50 ? "text-warning" : "text-destructive";
const percentBg = (p: number) => p >= 70 ? "bg-success/10" : p >= 50 ? "bg-warning/10" : "bg-destructive/10";

const Tests = () => {
  const [tab, setTab] = useState("available");
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<(TestResult & { test_title?: string; test_subject?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const userRole = profile?.role || "student";
  const { toast } = useToast();

  const [takingTest, setTakingTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [testScore, setTestScore] = useState({ score: 0, total: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTestSubject, setNewTestSubject] = useState("Matematika");
  const [newTestTitle, setNewTestTitle] = useState("");
  const [newTestGrade, setNewTestGrade] = useState("8");
  const [newTestTime, setNewTestTime] = useState("20");
  const [newQuestions, setNewQuestions] = useState<NewQuestion[]>([emptyQuestion()]);

  const [viewingResult, setViewingResult] = useState<(TestResult & { test_title?: string }) | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<Question[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [testsRes, resultsRes] = await Promise.all([
      supabase.from("tests").select("*").order("created_at", { ascending: false }),
      supabase.from("test_results").select("*").order("completed_at", { ascending: false }),
    ]);
    const testsData = testsRes.data || [];
    setTests(testsData);
    const resultsData = (resultsRes.data || []).map((r: any) => {
      const test = testsData.find((t: Test) => t.id === r.test_id);
      return { ...r, test_title: test?.title || "Ismeretlen teszt", test_subject: test?.subject || "" };
    });
    setResults(resultsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!takingTest || submitted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleSubmitTest(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [takingTest, submitted, timeLeft]);

  const startTest = async (test: Test) => {
    const { data, error } = await supabase.from("test_questions").select("*").eq("test_id", test.id).order("sort_order");
    if (error || !data?.length) { toast({ title: "Nem sikerült betölteni a kérdéseket", variant: "destructive" }); return; }
    setTakingTest(test);
    setQuestions(data);
    setCurrentQ(0);
    setAnswers({});
    setSubmitted(false);
    setTestScore({ score: 0, total: 0, percentage: 0 });
    setTimeLeft(test.time_limit_minutes * 60);
  };

  const isAnswerCorrect = (q: Question, answer: string | undefined) => {
    if (!answer) return false;
    if (q.question_type === "fill_in") {
      return answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    }
    return answer === q.correct_answer;
  };

  const handleSubmitTest = async () => {
    if (!takingTest) return;
    let score = 0;
    questions.forEach((q) => { if (isAnswerCorrect(q, answers[q.id])) score++; });
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    setTestScore({ score, total, percentage });
    setSubmitted(true);

    const answersArray = questions.map((q) => ({
      question_id: q.id, selected: answers[q.id] || null,
      correct: q.correct_answer, is_correct: isAnswerCorrect(q, answers[q.id]),
    }));

    await supabase.from("test_results").insert({
      test_id: takingTest.id, score, total_questions: total, percentage, answers: answersArray,
    });
    fetchData();
  };

  const exitTest = () => { setTakingTest(null); setQuestions([]); setSubmitted(false); };

  const viewResultDetail = async (result: TestResult & { test_title?: string }) => {
    const { data } = await supabase.from("test_questions").select("*").eq("test_id", result.test_id).order("sort_order");
    setViewingResult(result);
    setViewingQuestions(data || []);
  };

  const handleCreateTest = async () => {
    if (!newTestTitle.trim()) { toast({ title: "A cím kötelező!", variant: "destructive" }); return; }
    const validQs = newQuestions.filter((q) => {
      if (!q.question) return false;
      if (q.type === "multiple_choice") return q.a && q.b && q.c && q.d;
      if (q.type === "true_false") return true;
      if (q.type === "fill_in") return q.correct.trim() !== "";
      if (q.type === "ordering") return q.a && q.b;
      return false;
    });
    if (validQs.length === 0) { toast({ title: "Legalább egy teljes kérdés szükséges!", variant: "destructive" }); return; }

    const { data: test, error } = await supabase.from("tests").insert({
      subject: newTestSubject, title: newTestTitle.trim(), grade: parseInt(newTestGrade),
      time_limit_minutes: parseInt(newTestTime), creator_name: user.displayName || user.username, is_system: false,
    }).select().single();

    if (error || !test) { toast({ title: "Hiba a teszt létrehozásánál", variant: "destructive" }); return; }

    const questionsToInsert = validQs.map((q, i) => {
      let optA = q.a, optB = q.b, optC = q.c, optD = q.d, correct = q.correct;
      if (q.type === "true_false") {
        optA = "Igaz"; optB = "Hamis"; optC = "-"; optD = "-";
        correct = q.correct; // "A" for Igaz, "B" for Hamis
      }
      if (q.type === "fill_in") {
        optA = "-"; optB = "-"; optC = "-"; optD = "-";
        correct = q.correct; // the text answer
      }
      if (q.type === "ordering") {
        // Store items in options, correct answer is the correct order as "1,2,3,4"
        correct = q.correct;
      }
      return {
        test_id: test.id, question: q.question, question_type: q.type,
        option_a: optA, option_b: optB, option_c: optC || "-", option_d: optD || "-",
        correct_answer: correct, explanation: q.explanation || null, sort_order: i + 1,
      };
    });

    await supabase.from("test_questions").insert(questionsToInsert);
    toast({ title: "Teszt létrehozva!" });
    setCreateOpen(false);
    setNewTestTitle("");
    setNewQuestions([emptyQuestion()]);
    fetchData();
  };

  const updateNewQ = (idx: number, field: keyof NewQuestion, value: string) => {
    setNewQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ===================== QUESTION RENDERER (taking test) =====================
  const renderQuestionInput = (q: Question) => {
    const qType = q.question_type || "multiple_choice";

    if (qType === "true_false") {
      return (
        <div className="space-y-3">
          {["A", "B"].map((label) => (
            <button key={label} onClick={() => setAnswers((a) => ({ ...a, [q.id]: label }))}
              className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all flex items-center gap-3 ${
                answers[q.id] === label ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                answers[q.id] === label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{label === "A" ? "I" : "H"}</span>
              <span className="font-medium">{label === "A" ? "Igaz" : "Hamis"}</span>
            </button>
          ))}
        </div>
      );
    }

    if (qType === "fill_in") {
      return (
        <div>
          <Label className="text-muted-foreground text-sm mb-2 block">Írd be a választ:</Label>
          <Input
            value={answers[q.id] || ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            className="rounded-xl text-lg py-6"
            placeholder="A válaszod..."
          />
        </div>
      );
    }

    if (qType === "ordering") {
      const items = [q.option_a, q.option_b, q.option_c, q.option_d].filter((x) => x && x !== "-");
      const currentOrder = answers[q.id] ? answers[q.id].split(",") : items.map((_, i) => String(i + 1));

      const moveUp = (idx: number) => {
        if (idx === 0) return;
        const order = [...currentOrder];
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        setAnswers((a) => ({ ...a, [q.id]: order.join(",") }));
      };
      const moveDown = (idx: number) => {
        if (idx >= currentOrder.length - 1) return;
        const order = [...currentOrder];
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        setAnswers((a) => ({ ...a, [q.id]: order.join(",") }));
      };

      const orderedItems = currentOrder.map((pos) => items[parseInt(pos) - 1]);

      return (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm mb-2 block">Rendezd a helyes sorrendbe (nyilakkal):</Label>
          {orderedItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 border border-border">
              <span className="font-bold text-muted-foreground w-6">{idx + 1}.</span>
              <span className="flex-1 font-medium">{item}</span>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx >= orderedItems.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default: multiple_choice
    const optionLabels = ["A", "B", "C", "D"] as const;
    const optionValues = [q.option_a, q.option_b, q.option_c, q.option_d];
    return (
      <div className="space-y-3">
        {optionLabels.map((label, i) => (
          <button key={label} onClick={() => setAnswers((a) => ({ ...a, [q.id]: label }))}
            className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all flex items-center gap-3 ${
              answers[q.id] === label ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/50"
            }`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              answers[q.id] === label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{label}</span>
            <span className="font-medium">{optionValues[i]}</span>
          </button>
        ))}
      </div>
    );
  };

  // ===================== RESULT QUESTION RENDERER =====================
  const renderResultQuestion = (question: Question, selected: string | undefined, isCorrect: boolean, idx: number) => {
    const qType = question.question_type || "multiple_choice";

    if (qType === "fill_in") {
      return (
        <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
          className={`bg-card rounded-2xl border-2 p-5 ${isCorrect ? "border-success/30" : "border-destructive/30"}`}>
          <div className="flex items-start gap-3 mb-3">
            {isCorrect ? <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
            <p className="font-semibold">{idx + 1}. {question.question}</p>
          </div>
          <div className="ml-8 space-y-1">
            <p className="text-sm">A te válaszod: <span className={isCorrect ? "text-success font-bold" : "text-destructive font-bold line-through"}>{selected || "—"}</span></p>
            {!isCorrect && <p className="text-sm text-success font-bold">Helyes válasz: {question.correct_answer}</p>}
          </div>
          {!isCorrect && question.explanation && (
            <div className="mt-3 ml-8 bg-primary/5 rounded-xl p-3 text-sm">
              <span className="font-semibold text-primary">Magyarázat:</span> {question.explanation}
            </div>
          )}
        </motion.div>
      );
    }

    if (qType === "true_false") {
      return (
        <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
          className={`bg-card rounded-2xl border-2 p-5 ${isCorrect ? "border-success/30" : "border-destructive/30"}`}>
          <div className="flex items-start gap-3 mb-3">
            {isCorrect ? <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
            <p className="font-semibold">{idx + 1}. {question.question}</p>
          </div>
          <div className="ml-8 grid grid-cols-2 gap-2">
            {["A", "B"].map((label) => {
              const isRight = question.correct_answer === label;
              const isSel = selected === label;
              let style = "border-border bg-background";
              if (isRight) style = "border-success bg-success/5 text-success";
              else if (isSel) style = "border-destructive bg-destructive/5 text-destructive";
              return (
                <div key={label} className={`rounded-xl border-2 px-4 py-2 text-sm flex items-center gap-2 ${style}`}>
                  <span className="font-bold">{label === "A" ? "Igaz" : "Hamis"}</span>
                  {isRight && <CheckCircle className="w-4 h-4 ml-auto text-success" />}
                  {isSel && !isRight && <XCircle className="w-4 h-4 ml-auto text-destructive" />}
                </div>
              );
            })}
          </div>
          {!isCorrect && question.explanation && (
            <div className="mt-3 ml-8 bg-primary/5 rounded-xl p-3 text-sm">
              <span className="font-semibold text-primary">Magyarázat:</span> {question.explanation}
            </div>
          )}
        </motion.div>
      );
    }

    // multiple_choice & ordering fallback
    const opts = [question.option_a, question.option_b, question.option_c, question.option_d];
    const labels = ["A", "B", "C", "D"];
    return (
      <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
        className={`bg-card rounded-2xl border-2 p-5 ${isCorrect ? "border-success/30" : "border-destructive/30"}`}>
        <div className="flex items-start gap-3 mb-3">
          {isCorrect ? <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />}
          <p className="font-semibold">{idx + 1}. {question.question}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 ml-8">
          {labels.map((label, oi) => {
            if (opts[oi] === "-") return null;
            const isSelected = selected === label;
            const isRight = question.correct_answer === label;
            let style = "border-border bg-background";
            if (isRight) style = "border-success bg-success/5 text-success";
            else if (isSelected && !isRight) style = "border-destructive bg-destructive/5 text-destructive line-through";
            return (
              <div key={label} className={`rounded-xl border-2 px-4 py-2 text-sm flex items-center gap-2 ${style}`}>
                <span className="font-bold">{label})</span> {opts[oi]}
                {isRight && <CheckCircle className="w-4 h-4 ml-auto text-success" />}
                {isSelected && !isRight && <XCircle className="w-4 h-4 ml-auto text-destructive" />}
              </div>
            );
          })}
        </div>
        {!isCorrect && question.explanation && (
          <div className="mt-3 ml-8 bg-primary/5 rounded-xl p-3 text-sm">
            <span className="font-semibold text-primary">Magyarázat:</span> {question.explanation}
          </div>
        )}
        {!isCorrect && !selected && (
          <p className="mt-2 ml-8 text-sm text-muted-foreground italic">Nem adtál választ erre a kérdésre.</p>
        )}
      </motion.div>
    );
  };

  // ===================== CREATE QUESTION FORM =====================
  const renderCreateQuestionForm = (q: NewQuestion, qi: number) => {
    const typeBlock = () => {
      if (q.type === "true_false") {
        return (
          <div>
            <Label className="text-xs">Helyes válasz</Label>
            <Select value={q.correct} onValueChange={(v) => updateNewQ(qi, "correct", v)}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Igaz</SelectItem>
                <SelectItem value="B">Hamis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }

      if (q.type === "fill_in") {
        return (
          <div>
            <Label className="text-xs">Helyes válasz (szöveg) *</Label>
            <Input value={q.correct} onChange={(e) => updateNewQ(qi, "correct", e.target.value)}
              className="rounded-xl mt-1" placeholder="A pontos helyes válasz" />
          </div>
        );
      }

      if (q.type === "ordering") {
        return (
          <div className="space-y-2">
            <Label className="text-xs">Elemek helyes sorrendben (minden sor = 1 elem)</Label>
            {["a", "b", "c", "d"].map((opt, i) => (
              <Input key={opt} value={q[opt as keyof NewQuestion] as string}
                onChange={(e) => updateNewQ(qi, opt as keyof NewQuestion, e.target.value)}
                className="rounded-xl" placeholder={`${i + 1}. elem (${i >= 2 ? "opcionális" : "kötelező"})`} />
            ))}
            <input type="hidden" value="" />
            <p className="text-xs text-muted-foreground">A helyes sorrend az lesz ahogy beírod (1, 2, 3, 4).</p>
          </div>
        );
      }

      // multiple_choice
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b", "c", "d"] as const).map((opt) => (
              <Input key={opt} value={q[opt]} onChange={(e) => updateNewQ(qi, opt, e.target.value)}
                className="rounded-xl" placeholder={`${opt.toUpperCase()}) válasz`} />
            ))}
          </div>
          <div className="mt-2">
            <Label className="text-xs">Helyes válasz</Label>
            <Select value={q.correct} onValueChange={(v) => updateNewQ(qi, "correct", v)}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{["A", "B", "C", "D"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      );
    };

    return (
      <div key={qi} className="bg-muted/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">{qi + 1}. kérdés</span>
          <div className="flex items-center gap-2">
            <Select value={q.type} onValueChange={(v) => {
              const nq = [...newQuestions];
              nq[qi] = { ...nq[qi], type: v, correct: v === "true_false" ? "A" : v === "ordering" ? "1,2,3,4" : "A" };
              setNewQuestions(nq);
            }}>
              <SelectTrigger className="w-[150px] rounded-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(questionTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newQuestions.length > 1 && (
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setNewQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <Input value={q.question} onChange={(e) => updateNewQ(qi, "question", e.target.value)}
          className="mb-2 rounded-xl" placeholder="Kérdés szövege" />
        {typeBlock()}
        <div className="mt-2">
          <Label className="text-xs">Magyarázat (opcionális)</Label>
          <Input value={q.explanation} onChange={(e) => updateNewQ(qi, "explanation", e.target.value)}
            className="rounded-xl mt-1" placeholder="Miért ez a helyes?" />
        </div>
      </div>
    );
  };

  // ============== TEST TAKING VIEW ==============
  if (takingTest) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={exitTest} className="gap-2 rounded-full">
              <ArrowLeft className="w-4 h-4" /> Kilépés
            </Button>
            <h2 className="font-bold text-lg">{takingTest.title}</h2>
            <div className="flex items-center gap-2">
              {!submitted && (
                <Badge className={`${timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"} gap-1`}>
                  <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
                </Badge>
              )}
              <Badge variant="outline">{currentQ + 1}/{questions.length}</Badge>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {submitted ? (
            <div>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
                <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${percentBg(testScore.percentage)} mb-4`}>
                  <Trophy className={`w-12 h-12 ${percentColor(testScore.percentage)}`} />
                </div>
                <h2 className="text-3xl font-black">{testScore.score}/{testScore.total}</h2>
                <p className={`text-4xl font-black ${percentColor(testScore.percentage)}`}>{testScore.percentage}%</p>
                <p className="text-muted-foreground mt-2">
                  {testScore.percentage >= 80 ? "Kiváló munka! 🎉" : testScore.percentage >= 60 ? "Jó munka! 👍" : testScore.percentage >= 40 ? "Gyakorolj még! 📚" : "Ne csüggedj, próbáld újra! 💪"}
                </p>
              </motion.div>
              <div className="space-y-4">
                {questions.map((question, i) => {
                  const selected = answers[question.id];
                  const correct = isAnswerCorrect(question, selected);
                  return renderResultQuestion(question, selected, correct, i);
                })}
              </div>
              <Button onClick={exitTest} className="w-full mt-8 rounded-full bg-primary hover:bg-primary/90 font-bold text-lg py-5">
                Vissza a tesztekhez
              </Button>
            </div>
          ) : (
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-muted-foreground text-sm">Kérdés {currentQ + 1}/{questions.length}</p>
                {q && (
                  <Badge variant="outline" className="text-xs">
                    {questionTypeLabels[q.question_type || "multiple_choice"]}
                  </Badge>
                )}
              </div>
              <h3 className="text-xl font-bold mb-6">{q?.question}</h3>
              {q && renderQuestionInput(q)}
              <div className="flex items-center justify-between mt-8">
                <Button variant="outline" onClick={() => setCurrentQ((c) => c - 1)} disabled={currentQ === 0} className="rounded-full gap-2">
                  <ArrowLeft className="w-4 h-4" /> Előző
                </Button>
                <div className="flex gap-1.5">
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentQ(i)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        i === currentQ ? "bg-primary scale-125" : answers[questions[i].id] ? "bg-primary/40" : "bg-muted"
                      }`} />
                  ))}
                </div>
                {currentQ < questions.length - 1 ? (
                  <Button onClick={() => setCurrentQ((c) => c + 1)} className="rounded-full gap-2 bg-primary hover:bg-primary/90">
                    Következő <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmitTest} className="rounded-full gap-2 bg-success hover:bg-success/90 text-success-foreground">
                    Beküldés <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    );
  }

  // ============== MAIN VIEW ==============
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
            <Button onClick={() => setCreateOpen(true)} className="bg-card text-foreground hover:bg-card/90 rounded-full gap-2 font-bold">
              <Plus className="w-4 h-4" /> Új Teszt
            </Button>
          )}
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-full bg-muted p-1 mb-6">
            <TabsTrigger value="available" className="rounded-full">Elérhető Tesztek ({tests.length})</TabsTrigger>
            <TabsTrigger value="results" className="rounded-full">Eredményeim ({results.length})</TabsTrigger>
            {user.role === "teacher" && <TabsTrigger value="own" className="rounded-full">Saját Tesztjeim</TabsTrigger>}
          </TabsList>

          <TabsContent value="available">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nincsenek elérhető tesztek.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tests.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={subjectColors[t.subject] || "bg-muted text-muted-foreground"}>{t.subject}</Badge>
                      <Badge variant="outline" className="text-xs">{t.grade}. oszt.</Badge>
                    </div>
                    <h3 className="font-bold text-lg">{t.title}</h3>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.time_limit_minutes} perc</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <User className="w-3 h-3" /> {t.creator_name}
                    </div>
                    <Button onClick={() => startTest(t)} className="mt-4 w-full rounded-full bg-success hover:bg-success/90 text-success-foreground">
                      Teszt Kitöltése
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Még nincs eredményed. Tölts ki egy tesztet!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => viewResultDetail(r)}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {r.test_subject && <Badge className={`${subjectColors[r.test_subject] || "bg-muted text-muted-foreground"} text-xs`}>{r.test_subject}</Badge>}
                      </div>
                      <h3 className="font-bold">{r.test_title}</h3>
                      <p className="text-sm text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("hu-HU")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{r.score}/{r.total_questions}</p>
                      <p className={`text-lg font-black ${percentColor(Number(r.percentage))}`}>{r.percentage}%</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {user.role === "teacher" && (
            <TabsContent value="own">
              {tests.filter((t) => !t.is_system).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Még nem hoztál létre tesztet.</p>
                  <Button onClick={() => setCreateOpen(true)} className="mt-4 rounded-full gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4" /> Új Teszt Létrehozása
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tests.filter((t) => !t.is_system).map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-2xl border border-border p-5">
                      <Badge className={subjectColors[t.subject] || "bg-muted text-muted-foreground"}>{t.subject}</Badge>
                      <h3 className="font-bold text-lg mt-2">{t.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t.grade}. osztály · {t.time_limit_minutes} perc</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* View Result Detail Dialog */}
      <Dialog open={!!viewingResult} onOpenChange={(o) => { if (!o) setViewingResult(null); }}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{viewingResult?.test_title} — Eredmény</span>
              <Badge className={`${percentColor(Number(viewingResult?.percentage))} ${percentBg(Number(viewingResult?.percentage))} text-lg px-3`}>
                {viewingResult?.score}/{viewingResult?.total_questions} ({viewingResult?.percentage}%)
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {viewingQuestions.map((q, i) => {
              const answerData = (viewingResult?.answers as any[])?.find((a: any) => a.question_id === q.id);
              const selected = answerData?.selected;
              const correct = answerData?.is_correct;
              return renderResultQuestion(q, selected, correct, i);
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Test Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Új teszt létrehozása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold">Tantárgy</Label>
                <Select value={newTestSubject} onValueChange={setNewTestSubject}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-semibold">Évfolyam</Label>
                <Select value={newTestGrade} onValueChange={setNewTestGrade}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}. osztály</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold">Teszt címe *</Label>
                <Input value={newTestTitle} onChange={(e) => setNewTestTitle(e.target.value)} className="mt-1.5 rounded-xl" placeholder="pl. Törtek dolgozat" />
              </div>
              <div>
                <Label className="font-semibold">Időkorlát (perc)</Label>
                <Input type="number" value={newTestTime} onChange={(e) => setNewTestTime(e.target.value)} className="mt-1.5 rounded-xl" />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Kérdések</h3>
                <div className="flex gap-1.5">
                  {Object.entries(questionTypeLabels).map(([k, v]) => {
                    const Icon = questionTypeIcons[k];
                    return (
                      <Badge key={k} variant="outline" className="text-xs gap-1">
                        <Icon className="w-3 h-3" /> {v}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              {newQuestions.map((q, qi) => renderCreateQuestionForm(q, qi))}
              <Button variant="outline" onClick={() => setNewQuestions((qs) => [...qs, emptyQuestion()])}
                className="rounded-full gap-2 w-full">
                <Plus className="w-4 h-4" /> Kérdés hozzáadása
              </Button>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Mégse</Button>
            <Button onClick={handleCreateTest} className="rounded-xl bg-primary hover:bg-primary/90">Teszt Létrehozása</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tests;
