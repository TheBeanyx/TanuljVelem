import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, GripVertical, ArrowUp, ArrowDown, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type AnyTaskData = any;

export type RendererResult = {
  awarded_points: number;
  feedback_markdown: string;
  submission_summary: string;
};

type Props = {
  taskType: string;
  data: AnyTaskData;
  maxPoints: number;
  done: boolean;
  savedResult?: RendererResult | null;
  // for writing only
  writingDraft?: string;
  setWritingDraft?: (s: string) => void;
  onSubmitWriting?: () => void;
  submittingWriting?: boolean;
  // for interactive: called when user submits and we already computed result
  onSubmitInteractive?: (r: RendererResult) => void;
};

// Helper: shuffle deterministically per render? Use seed = stable from data
function useShuffled<T>(arr: T[], seed: string): T[] {
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      h = (h * 1664525 + 1013904223) >>> 0;
      const j = h % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [arr, seed]);
}

export default function ChallengeTaskRenderer(props: Props) {
  const { taskType, data, done, savedResult } = props;

  if (done && savedResult) {
    return (
      <div>
        <div className="mb-3 p-3 bg-muted/40 rounded-lg text-sm">
          <p className="font-semibold mb-1">Válaszod</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{savedResult.submission_summary}</p>
        </div>
        <Card className="p-3 bg-muted/40">
          <p className="text-xs font-semibold mb-1">💬 Visszajelzés</p>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{savedResult.feedback_markdown}</ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  }

  switch (taskType) {
    case "writing": return <WritingTask {...props} />;
    case "multiple_choice": return <MultipleChoiceTask {...props} />;
    case "matching": return <MatchingTask {...props} />;
    case "sort_groups": return <SortGroupsTask {...props} />;
    case "order_sequence": return <OrderSequenceTask {...props} />;
    case "true_false": return <TrueFalseTask {...props} />;
    case "fill_blanks": return <FillBlanksTask {...props} />;
    case "pick_many": return <PickManyTask {...props} />;
    case "crossword": return <CrosswordTask {...props} />;
    case "memory": return <MemoryTask {...props} />;
    case "odd_one_out": return <OddOneOutTask {...props} />;
    default:
      return <p className="text-sm text-muted-foreground">Ismeretlen feladattípus: {taskType}</p>;
  }
}

// ============ WRITING ============
function WritingTask({ data, writingDraft = "", setWritingDraft, onSubmitWriting, submittingWriting, done }: Props) {
  return (
    <div>
      <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
        <ReactMarkdown>{data.prompt_markdown || ""}</ReactMarkdown>
      </div>
      <Label className="text-xs font-semibold">A te válaszod</Label>
      <Textarea
        value={writingDraft}
        onChange={(e) => setWritingDraft?.(e.target.value)}
        placeholder="Írd ide röviden..."
        rows={4}
        disabled={done}
        className="mt-1.5"
      />
      {!done && (
        <Button onClick={onSubmitWriting} disabled={submittingWriting} size="sm" className="mt-3 gradient-hero text-white gap-2">
          {submittingWriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Beküldés
        </Button>
      )}
    </div>
  );
}

// ============ MULTIPLE CHOICE ============
function MultipleChoiceTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const submit = () => {
    if (sel == null) return;
    const correct = sel === data.correct_index;
    const pts = correct ? maxPoints : 0;
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: correct
        ? `✅ **Helyes!** ${data.explanation || ""}`
        : `❌ **Sajnos nem.** A helyes válasz: **${data.options[data.correct_index]}**. ${data.explanation || ""}`,
      submission_summary: `Választott: ${data.options[sel]}`,
    });
  };
  return (
    <div>
      <p className="font-medium mb-3">{data.question}</p>
      <div className="space-y-2 mb-3">
        {data.options.map((opt: string, i: number) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            className={cn(
              "w-full text-left px-4 py-2.5 rounded-lg border-2 transition-all text-sm",
              sel === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            )}
          >
            <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
          </button>
        ))}
      </div>
      <Button onClick={submit} disabled={sel == null} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Válasz beküldése
      </Button>
    </div>
  );
}

// ============ MATCHING ============
function MatchingTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const pairs: { left: string; right: string }[] = data.pairs || [];
  const rights = useShuffled(pairs.map((p, i) => ({ text: p.right, originalIndex: i })), pairs.map(p => p.right).join("|"));
  const [assignments, setAssignments] = useState<Record<number, number | null>>(
    () => Object.fromEntries(pairs.map((_, i) => [i, null]))
  );
  const usedRights = new Set(Object.values(assignments).filter((v) => v != null) as number[]);
  const allAssigned = Object.values(assignments).every((v) => v != null);

  const submit = () => {
    let correct = 0;
    pairs.forEach((_, leftIdx) => { if (assignments[leftIdx] === leftIdx) correct++; });
    const pct = correct / pairs.length;
    const pts = Math.round(maxPoints * pct);
    const summary = pairs.map((p, i) => {
      const chosen = assignments[i] != null ? pairs[assignments[i]!].right : "—";
      return `${p.left} → ${chosen}`;
    }).join("\n");
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `${correct}/${pairs.length} pár helyes (${Math.round(pct * 100)}%).${correct < pairs.length ? "\n\n**Helyes párok:**\n" + pairs.map(p => `- ${p.left} → ${p.right}`).join("\n") : " 🎉"}`,
      submission_summary: summary,
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-2 mb-3">
        {pairs.map((p, leftIdx) => (
          <div key={leftIdx} className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-primary/10 rounded-lg text-sm font-medium">{p.left}</div>
            <span className="text-muted-foreground">→</span>
            <select
              value={assignments[leftIdx] ?? ""}
              onChange={(e) => setAssignments({ ...assignments, [leftIdx]: e.target.value === "" ? null : Number(e.target.value) })}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm"
            >
              <option value="">— válassz —</option>
              {rights.map((r) => (
                <option key={r.originalIndex} value={r.originalIndex} disabled={usedRights.has(r.originalIndex) && assignments[leftIdx] !== r.originalIndex}>
                  {r.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={!allAssigned} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ SORT GROUPS ============
function SortGroupsTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const groups: { name: string; items: string[] }[] = data.groups || [];
  const allItems = useMemo(() => {
    const arr: { text: string; correctGroup: number }[] = [];
    groups.forEach((g, gi) => g.items.forEach((it) => arr.push({ text: it, correctGroup: gi })));
    return arr;
  }, [groups]);
  const shuffled = useShuffled(allItems, allItems.map(i => i.text).join("|"));
  const [placement, setPlacement] = useState<Record<number, number | null>>(
    () => Object.fromEntries(shuffled.map((_, i) => [i, null]))
  );
  const allPlaced = Object.values(placement).every((v) => v != null);

  const submit = () => {
    let correct = 0;
    shuffled.forEach((it, i) => { if (placement[i] === it.correctGroup) correct++; });
    const pct = correct / shuffled.length;
    const pts = Math.round(maxPoints * pct);
    const summary = groups.map((g, gi) => {
      const items = shuffled.filter((_, i) => placement[i] === gi).map((it) => it.text);
      return `${g.name}: ${items.join(", ") || "—"}`;
    }).join("\n");
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `${correct}/${shuffled.length} elem helyesen csoportosítva (${Math.round(pct * 100)}%).${correct < shuffled.length ? "\n\n**Helyes csoportosítás:**\n" + groups.map(g => `- **${g.name}:** ${g.items.join(", ")}`).join("\n") : " 🎉"}`,
      submission_summary: summary,
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-2 mb-3">
        {shuffled.map((it, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="flex-1 text-sm font-medium">{it.text}</span>
            <select
              value={placement[i] ?? ""}
              onChange={(e) => setPlacement({ ...placement, [i]: e.target.value === "" ? null : Number(e.target.value) })}
              className="px-2 py-1.5 rounded border-2 border-border bg-background text-xs"
            >
              <option value="">— csoport —</option>
              {groups.map((g, gi) => <option key={gi} value={gi}>{g.name}</option>)}
            </select>
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={!allPlaced} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ ORDER SEQUENCE ============
function OrderSequenceTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const correctOrder: string[] = data.ordered_items || [];
  const initial = useShuffled(correctOrder.map((t, i) => ({ text: t, correctIndex: i })), correctOrder.join("|"));
  const [order, setOrder] = useState(initial);

  const move = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= order.length) return;
    const next = [...order];
    [next[i], next[ni]] = [next[ni], next[i]];
    setOrder(next);
  };

  const submit = () => {
    let correct = 0;
    order.forEach((it, i) => { if (it.correctIndex === i) correct++; });
    const pct = correct / order.length;
    const pts = Math.round(maxPoints * pct);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `${correct}/${order.length} elem van a jó helyen (${Math.round(pct * 100)}%).${correct < order.length ? "\n\n**Helyes sorrend:**\n" + correctOrder.map((t, i) => `${i + 1}. ${t}`).join("\n") : " 🎉"}`,
      submission_summary: order.map((it, i) => `${i + 1}. ${it.text}`).join("\n"),
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-2 mb-3">
        {order.map((it, i) => (
          <div key={it.text} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold w-6 text-center">{i + 1}.</span>
            <span className="flex-1 text-sm">{it.text}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === order.length - 1}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button onClick={submit} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ TRUE / FALSE ============
function TrueFalseTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const statements: { text: string; is_true: boolean }[] = data.statements || [];
  const [answers, setAnswers] = useState<Record<number, boolean | null>>(
    () => Object.fromEntries(statements.map((_, i) => [i, null]))
  );
  const allDone = Object.values(answers).every((v) => v !== null);
  const submit = () => {
    let correct = 0;
    statements.forEach((s, i) => { if (answers[i] === s.is_true) correct++; });
    const pct = correct / statements.length;
    const pts = Math.round(maxPoints * pct);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `${correct}/${statements.length} válasz helyes (${Math.round(pct * 100)}%).\n\n` +
        statements.map((s, i) => `${answers[i] === s.is_true ? "✅" : "❌"} *${s.text}* — **${s.is_true ? "IGAZ" : "HAMIS"}**`).join("\n"),
      submission_summary: statements.map((s, i) => `${s.text}: ${answers[i] ? "igaz" : "hamis"}`).join("\n"),
    });
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-2 mb-3">
        {statements.map((s, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="flex-1 text-sm">{s.text}</span>
            <div className="flex gap-1">
              <Button
                size="sm" variant={answers[i] === true ? "default" : "outline"}
                onClick={() => setAnswers({ ...answers, [i]: true })}
                className={cn("h-7 px-3", answers[i] === true && "bg-emerald-500 hover:bg-emerald-600")}
              >Igaz</Button>
              <Button
                size="sm" variant={answers[i] === false ? "default" : "outline"}
                onClick={() => setAnswers({ ...answers, [i]: false })}
                className={cn("h-7 px-3", answers[i] === false && "bg-rose-500 hover:bg-rose-600")}
              >Hamis</Button>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={!allDone} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ FILL BLANKS ============
function FillBlanksTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const sentence: string = data.sentence || "";
  const answers: string[] = data.answers || [];
  const wordBank: string[] = data.word_bank || [];
  const blankCount = (sentence.match(/_{2,}/g) || []).length || answers.length;
  const [filled, setFilled] = useState<(string | null)[]>(() => new Array(blankCount).fill(null));
  const usedWords = new Set(filled.filter(Boolean) as string[]);
  const allFilled = filled.every((v) => v != null);

  const submit = () => {
    let correct = 0;
    filled.forEach((v, i) => {
      if (v && answers[i] && v.toLowerCase().trim() === answers[i].toLowerCase().trim()) correct++;
    });
    const pct = correct / answers.length;
    const pts = Math.round(maxPoints * pct);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `${correct}/${answers.length} jó válasz (${Math.round(pct * 100)}%).${correct < answers.length ? "\n\n**Helyes szavak:** " + answers.join(", ") : " 🎉"}`,
      submission_summary: filled.map((v, i) => `${i + 1}. ${v || "—"}`).join(", "),
    });
  };

  // Split sentence and render
  const parts = sentence.split(/_{2,}/);
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="p-3 bg-muted/30 rounded-lg mb-3 text-sm leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blankCount && (
              <span className={cn(
                "inline-block mx-1 px-2 py-0.5 rounded border-2 border-dashed min-w-[80px] text-center font-bold",
                filled[i] ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/40 text-muted-foreground"
              )}>
                {filled[i] || "___"}
              </span>
            )}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-1.5">Válassz a szavakból (kattints a szóra majd a helyre):</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {wordBank.map((w, i) => (
          <button
            key={i}
            onClick={() => {
              const nextSlot = filled.findIndex((v) => v == null);
              if (nextSlot === -1) return;
              if (usedWords.has(w)) return;
              const next = [...filled];
              next[nextSlot] = w;
              setFilled(next);
            }}
            disabled={usedWords.has(w)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all",
              usedWords.has(w) ? "border-border bg-muted text-muted-foreground line-through opacity-50" : "border-primary/30 bg-primary/5 hover:border-primary"
            )}
          >{w}</button>
        ))}
        {filled.some((v) => v != null) && (
          <button
            onClick={() => setFilled(new Array(blankCount).fill(null))}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
          >Törlés</button>
        )}
      </div>
      <Button onClick={submit} disabled={!allFilled} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ PICK MANY ============
function PickManyTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const options: string[] = data.options || [];
  const correctSet = new Set<number>(data.correct_indices || []);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };
  const submit = () => {
    let tp = 0, fp = 0, fn = 0;
    options.forEach((_, i) => {
      if (correctSet.has(i) && selected.has(i)) tp++;
      else if (!correctSet.has(i) && selected.has(i)) fp++;
      else if (correctSet.has(i) && !selected.has(i)) fn++;
    });
    const totalCorrect = correctSet.size;
    const rawScore = Math.max(0, tp - fp) / totalCorrect;
    const pts = Math.round(maxPoints * rawScore);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown: `Talált helyes: **${tp}/${totalCorrect}**, hibás jelölés: **${fp}**.${rawScore < 1 ? "\n\n**Helyes válaszok:** " + Array.from(correctSet).map((i) => options[i]).join(", ") : " 🎉"}`,
      submission_summary: Array.from(selected).map((i) => options[i]).join(", ") || "—",
    });
  };
  return (
    <div>
      <p className="font-medium mb-1">{data.question}</p>
      <p className="text-xs text-muted-foreground mb-3">Több jó válasz is van — jelöld be MINDET.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={cn(
              "text-left px-3 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-2",
              selected.has(i) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center",
              selected.has(i) ? "bg-primary border-primary" : "border-muted-foreground"
            )}>
              {selected.has(i) && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            {opt}
          </button>
        ))}
      </div>
      <Button onClick={submit} disabled={selected.size === 0} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ CROSSWORD (mini keresztrejtvény) ============
function CrosswordTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const rows: { clue: string; answer: string; highlight_index: number }[] = data.rows || [];
  const [inputs, setInputs] = useState<string[]>(() => rows.map(() => ""));
  const anyFilled = inputs.some((v) => v.trim().length > 0);

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  const submit = () => {
    let correct = 0;
    rows.forEach((r, i) => { if (norm(inputs[i]) === norm(r.answer)) correct++; });
    const pct = rows.length ? correct / rows.length : 0;
    const pts = Math.round(maxPoints * pct);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown:
        `${correct}/${rows.length} megoldás helyes (${Math.round(pct * 100)}%).` +
        (correct < rows.length
          ? "\n\n**Helyes megoldások:**\n" + rows.map((r, i) => `${i + 1}. ${r.clue} → **${r.answer}**`).join("\n")
          : " 🎉") +
        (data.solution_word ? `\n\n🔑 A megfejtés: **${data.solution_word}**` : ""),
      submission_summary: rows.map((r, i) => `${i + 1}. ${inputs[i] || "—"}`).join("\n"),
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-2.5 mb-3">
        {rows.map((r, i) => {
          const val = inputs[i];
          const len = Math.max(r.answer.replace(/\s+/g, "").length, 3);
          const hi = Math.min(r.highlight_index ?? 0, len - 1);
          return (
            <div key={i} className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs font-medium mb-1.5">
                <span className="font-bold text-primary mr-1">{i + 1}.</span>{r.clue}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: len }).map((_, ci) => (
                    <span
                      key={ci}
                      className={cn(
                        "w-7 h-8 rounded border-2 flex items-center justify-center text-sm font-bold uppercase",
                        ci === hi ? "border-primary bg-primary/15 text-primary" : "border-border bg-background"
                      )}
                    >
                      {val[ci] || ""}
                    </span>
                  ))}
                </div>
              </div>
              <input
                value={val}
                maxLength={len}
                onChange={(e) => {
                  const next = [...inputs];
                  next[i] = e.target.value.replace(/\s+/g, "");
                  setInputs(next);
                }}
                placeholder="Írd be a szót…"
                className="mt-2 w-full rounded-md border-2 border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        🔑 A kiemelt betűk fentről lefelé egy megfejtést adnak!
      </p>
      <Button onClick={submit} disabled={!anyFilled} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}

// ============ MEMORY (memóriajáték) ============
function MemoryTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const pairs: { a: string; b: string }[] = data.pairs || [];
  const cards = useMemo(
    () => pairs.flatMap((p, i) => [{ text: p.a, pair: i }, { text: p.b, pair: i }]),
    [pairs]
  );
  const deck = useShuffled(cards, pairs.map((p) => p.a + p.b).join("|"));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);

  const allMatched = matched.size === deck.length && deck.length > 0;

  const flip = (i: number) => {
    if (locked || matched.has(i) || flipped.includes(i)) return;
    const next = [...flipped, i];
    if (next.length < 2) { setFlipped(next); return; }
    setFlipped(next);
    setTries((t) => t + 1);
    setLocked(true);
    const [x, y] = next;
    if (deck[x].pair === deck[y].pair) {
      window.setTimeout(() => {
        setMatched((m) => new Set([...m, x, y]));
        setFlipped([]);
        setLocked(false);
      }, 450);
    } else {
      window.setTimeout(() => { setFlipped([]); setLocked(false); }, 850);
    }
  };

  const submit = () => {
    const perfectTries = pairs.length;
    // 100% ha max 1.5x annyi próbálkozásból megvan, utána arányosan csökken
    const efficiency = Math.max(0.4, Math.min(1, (perfectTries * 1.5) / Math.max(tries, 1)));
    const pts = Math.round(maxPoints * efficiency);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown:
        `🧠 Minden párt megtaláltál **${tries} próbálkozásból** (ideális: ${perfectTries}).\n\n` +
        `Hatékonyság: **${Math.round(efficiency * 100)}%**\n\n**Párok:**\n` +
        pairs.map((p) => `- ${p.a} ↔ ${p.b}`).join("\n"),
      submission_summary: `Memóriajáték teljesítve ${tries} próbálkozásból.`,
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{data.instructions}</p>
      <p className="text-xs text-muted-foreground mb-3">
        Találat: <span className="font-bold text-primary">{matched.size / 2}/{pairs.length}</span> · Próbálkozás: <span className="font-bold">{tries}</span>
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
        {deck.map((c, i) => {
          const isOpen = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={cn(
                "relative h-20 rounded-xl border-2 p-1.5 text-[11px] font-semibold leading-tight transition-all",
                matched.has(i)
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : isOpen
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/50 hover:border-primary/50"
              )}
            >
              {isOpen ? (
                <span className="flex h-full items-center justify-center text-center">{c.text}</span>
              ) : (
                <span className="flex h-full items-center justify-center text-2xl opacity-60">❓</span>
              )}
              {matched.has(i) && (
                <CheckCircle2 className="absolute right-1 top-1 h-3.5 w-3.5 text-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
      <Button onClick={submit} disabled={!allMatched} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> {allMatched ? "Beküldés" : "Találd meg az összes párt"}
      </Button>
    </div>
  );
}

// ============ ODD ONE OUT (kakukktojás) ============
function OddOneOutTask({ data, maxPoints, onSubmitInteractive }: Props) {
  const sets: { items: string[]; odd_index: number; reason: string }[] = data.sets || [];
  const [picks, setPicks] = useState<Record<number, number | null>>(
    () => Object.fromEntries(sets.map((_, i) => [i, null]))
  );
  const allPicked = Object.values(picks).every((v) => v != null);

  const submit = () => {
    let correct = 0;
    sets.forEach((s, i) => { if (picks[i] === s.odd_index) correct++; });
    const pct = sets.length ? correct / sets.length : 0;
    const pts = Math.round(maxPoints * pct);
    onSubmitInteractive?.({
      awarded_points: pts,
      feedback_markdown:
        `${correct}/${sets.length} kakukktojást találtál meg (${Math.round(pct * 100)}%).\n\n` +
        sets.map((s, i) =>
          `${picks[i] === s.odd_index ? "✅" : "❌"} **${s.items[s.odd_index]}** — _${s.reason}_`
        ).join("\n"),
      submission_summary: sets.map((s, i) => `${i + 1}. ${picks[i] != null ? s.items[picks[i]!] : "—"}`).join(", "),
    });
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">{data.instructions}</p>
      <div className="space-y-3 mb-3">
        {sets.map((s, si) => (
          <div key={si} className="rounded-lg bg-muted/30 p-2.5">
            <p className="text-xs font-bold text-muted-foreground mb-2">{si + 1}. csoport — melyik nem illik oda?</p>
            <div className="grid grid-cols-2 gap-2">
              {s.items.map((it, ii) => (
                <button
                  key={ii}
                  onClick={() => setPicks({ ...picks, [si]: ii })}
                  className={cn(
                    "rounded-lg border-2 px-2.5 py-2 text-left text-sm transition-all",
                    picks[si] === ii ? "border-primary bg-primary/10 font-semibold" : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  {it}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={!allPicked} size="sm" className="gradient-hero text-white gap-2">
        <Send className="w-4 h-4" /> Beküldés
      </Button>
    </div>
  );
}
