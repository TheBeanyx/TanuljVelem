import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Option = { value: string; label: string; emoji: string; desc?: string };
type Question = { key: string; title: string; subtitle?: string; multi?: boolean; options?: Option[]; text?: boolean };

const QUESTIONS: Question[] = [
  {
    key: "learning_style", title: "Milyen tanulási típus vagy?", subtitle: "Válaszd azt, ami a legjobban illik rád.",
    options: [
      { value: "visual", label: "Vizuális", emoji: "👀", desc: "Ábrák, színek, képek, videók" },
      { value: "auditory", label: "Auditív", emoji: "🎧", desc: "Hallgatás, magyarázat, hangos ismétlés" },
      { value: "reading", label: "Olvasó / író", emoji: "📖", desc: "Jegyzetelés, szövegek, listák" },
      { value: "kinesthetic", label: "Mozgásos", emoji: "🤸", desc: "Kipróbálás, gyakorlás, feladatok" },
    ],
  },
  {
    key: "grade", title: "Hányadikos vagy?",
    options: [
      { value: "1-4", label: "1–4. osztály", emoji: "🌱" },
      { value: "5-8", label: "5–8. osztály", emoji: "🌿" },
      { value: "9-10", label: "9–10. osztály", emoji: "🌳" },
      { value: "11-12", label: "11–12. osztály", emoji: "🎓" },
    ],
  },
  {
    key: "goals", title: "Mi a fő célod?", subtitle: "Többet is választhatsz.", multi: true,
    options: [
      { value: "grades", label: "Jobb jegyek", emoji: "📈" },
      { value: "exam", label: "Felkészülés vizsgára / érettségire", emoji: "📝" },
      { value: "homework", label: "Házik gyorsabban", emoji: "⚡" },
      { value: "understand", label: "Jobban megérteni az anyagot", emoji: "💡" },
    ],
  },
  {
    key: "hard_subjects", title: "Melyik tárgyak mennek nehezebben?", multi: true,
    options: [
      { value: "math", label: "Matematika", emoji: "➗" },
      { value: "languages", label: "Nyelvek", emoji: "🗣️" },
      { value: "science", label: "Természettudományok", emoji: "🔬" },
      { value: "humanities", label: "Magyar / Történelem", emoji: "🏛️" },
    ],
  },
  {
    key: "daily_time", title: "Naponta mennyi időt szánnál tanulásra?",
    options: [
      { value: "15", label: "kb. 15 perc", emoji: "⏱️" },
      { value: "30", label: "kb. 30 perc", emoji: "⌛" },
      { value: "60", label: "kb. 1 óra", emoji: "🕐" },
      { value: "90", label: "Több mint 1 óra", emoji: "🔥" },
    ],
  },
  {
    key: "best_time", title: "Mikor tanulsz a legszívesebben?",
    options: [
      { value: "morning", label: "Reggel", emoji: "🌅" },
      { value: "afternoon", label: "Délután", emoji: "☀️" },
      { value: "evening", label: "Este", emoji: "🌙" },
      { value: "varies", label: "Változó", emoji: "🔀" },
    ],
  },
  { key: "note", title: "Van még valami, amit tudnunk kéne?", subtitle: "Opcionális – pl. figyelemzavar, kedvenc téma.", text: true },
];

const HIDDEN = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [needed, setNeeded] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) { setNeeded(false); return; }
    supabase.from("user_onboarding").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => { if (!error) setNeeded(!data); });
  }, [user, loading]);

  if (!needed || HIDDEN.includes(pathname) || /^\/learn\/[^/]+/.test(pathname)) return null;

  const q = QUESTIONS[step];
  const val = answers[q.key];
  const canNext = q.text || (q.multi ? Array.isArray(val) && val.length > 0 : !!val);

  const pick = (v: string) => {
    if (q.multi) {
      const cur = Array.isArray(val) ? val : [];
      setAnswers({ ...answers, [q.key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
    } else {
      setAnswers({ ...answers, [q.key]: v });
      setTimeout(() => setStep((s) => Math.min(s + 1, QUESTIONS.length - 1)), 220);
    }
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { learning_style, ...rest } = answers;
    const { error } = await supabase.from("user_onboarding").upsert({
      user_id: user.id, learning_style: String(learning_style), answers: rest, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Nem sikerült menteni", variant: "destructive" }); return; }
    toast({ title: "Köszi! 🎉", description: "Ezek alapján szabjuk rád a tanulást." });
    setNeeded(false);
  };

  const last = step === QUESTIONS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" disabled={step === 0} onClick={() => setStep(step - 1)} aria-label="Vissza"><ArrowLeft className="w-5 h-5" /></Button>
          <Progress value={((step + 1) / QUESTIONS.length) * 100} className="h-3 flex-1" />
          <span className="text-xs text-muted-foreground font-bold">{step + 1}/{QUESTIONS.length}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}>
            {step === 0 && <div className="text-sm font-bold text-primary flex items-center gap-1 mb-2"><Sparkles className="w-4 h-4" />Ismerjünk meg!</div>}
            <h2 className="text-2xl sm:text-3xl font-extrabold">{q.title}</h2>
            {q.subtitle && <p className="text-muted-foreground mt-1">{q.subtitle}</p>}
            <div className="mt-6">
              {q.text ? (
                <Textarea rows={4} maxLength={500} value={(val as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder="Írd ide…" />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {q.options!.map((o) => {
                    const sel = q.multi ? Array.isArray(val) && val.includes(o.value) : val === o.value;
                    return (
                      <motion.button key={o.value} whileTap={{ scale: 0.97 }} onClick={() => pick(o.value)}
                        className={`text-left rounded-2xl border-2 border-b-4 p-4 transition ${sel ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                        <div className="text-3xl">{o.emoji}</div>
                        <div className="font-bold mt-1">{o.label}</div>
                        {o.desc && <div className="text-xs text-muted-foreground">{o.desc}</div>}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" />Csak te látod</span>
          {last ? (
            <Button className="rounded-full px-8" onClick={finish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kész"}
            </Button>
          ) : (
            <Button className="rounded-full px-8" disabled={!canNext} onClick={() => setStep(step + 1)}>Tovább<ArrowRight className="w-4 h-4 ml-1" /></Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingGate;
