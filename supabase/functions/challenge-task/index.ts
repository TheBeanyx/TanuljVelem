import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Te egy nagyon kreatív magyar tanár vagy a TanuljVelem platformon (1–12. évfolyam).
Magyarul írj, az évfolyamhoz illő nyelvezettel, lelkesen és játékosan.
A feladatok rövidek (3-10 perc), GYORSAK, INTERAKTÍVAK — minimális írással.
Sose unalmas! Tartalmilag mindig a megadott tantárgy és évfolyam anyagához kapcsolódjon.`;

// ===== Per-type generation schemas =====
const SCHEMAS: Record<string, any> = {
  writing: {
    name: "make_writing",
    description: "Egy rövid íráskészséget fejlesztő, kreatív, gondolkodtató mini-feladat.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        prompt_markdown: { type: "string", description: "Tömör, konkrét feladat 2-5 mondatban." },
        est_minutes: { type: "integer", minimum: 3, maximum: 12 },
        max_points: { type: "integer", minimum: 10, maximum: 25 },
      },
      required: ["title", "prompt_markdown", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  multiple_choice: {
    name: "make_mc",
    description: "Egy feleletválasztós kérdés 4 válaszlehetőséggel.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        question: { type: "string" },
        options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
        correct_index: { type: "integer", minimum: 0, maximum: 3 },
        explanation: { type: "string", description: "Rövid magyarázat miért az a helyes." },
        est_minutes: { type: "integer", minimum: 1, maximum: 4 },
        max_points: { type: "integer", minimum: 8, maximum: 15 },
      },
      required: ["title", "question", "options", "correct_index", "explanation", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  matching: {
    name: "make_matching",
    description: "Párosítós feladat 4-5 párral.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        instructions: { type: "string", description: "Mit kell párosítani." },
        pairs: {
          type: "array", minItems: 4, maxItems: 5,
          items: {
            type: "object",
            properties: { left: { type: "string" }, right: { type: "string" } },
            required: ["left", "right"],
            additionalProperties: false,
          },
        },
        est_minutes: { type: "integer", minimum: 2, maximum: 6 },
        max_points: { type: "integer", minimum: 10, maximum: 20 },
      },
      required: ["title", "instructions", "pairs", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  sort_groups: {
    name: "make_sort_groups",
    description: "Csoportba rendező feladat: a diáknak elemeket kell kategóriákba sorolnia.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        instructions: { type: "string" },
        groups: {
          type: "array", minItems: 2, maxItems: 4,
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "A csoport/kategória neve" },
              items: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
            },
            required: ["name", "items"],
            additionalProperties: false,
          },
        },
        est_minutes: { type: "integer", minimum: 2, maximum: 8 },
        max_points: { type: "integer", minimum: 10, maximum: 20 },
      },
      required: ["title", "instructions", "groups", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  order_sequence: {
    name: "make_order",
    description: "Sorrendbe rakós feladat: események/lépések/számok helyes sorrendje.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        instructions: { type: "string", description: "Mi szerint kell sorba rendezni (pl. időrend, méret, fontosság)" },
        ordered_items: {
          type: "array", minItems: 4, maxItems: 7,
          items: { type: "string" },
          description: "Az elemek a HELYES sorrendben.",
        },
        est_minutes: { type: "integer", minimum: 2, maximum: 6 },
        max_points: { type: "integer", minimum: 10, maximum: 18 },
      },
      required: ["title", "instructions", "ordered_items", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  true_false: {
    name: "make_tf",
    description: "5-7 állítás igaz/hamis döntéssel.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        instructions: { type: "string" },
        statements: {
          type: "array", minItems: 5, maxItems: 7,
          items: {
            type: "object",
            properties: { text: { type: "string" }, is_true: { type: "boolean" } },
            required: ["text", "is_true"],
            additionalProperties: false,
          },
        },
        est_minutes: { type: "integer", minimum: 2, maximum: 6 },
        max_points: { type: "integer", minimum: 10, maximum: 18 },
      },
      required: ["title", "instructions", "statements", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  fill_blanks: {
    name: "make_blanks",
    description: "Szókitöltős feladat: egy mondat, benne ___ helyekkel, és egy szókészlet amiből választani lehet.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        instructions: { type: "string" },
        sentence: { type: "string", description: "A mondat, ahol a hiányzó szavak helyén ___ szerepel." },
        answers: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" }, description: "Helyes válaszok a ___ helyek sorrendjében." },
        word_bank: { type: "array", minItems: 4, maxItems: 8, items: { type: "string" }, description: "A választható szavak (a helyesek + 2-3 elterelő)." },
        est_minutes: { type: "integer", minimum: 2, maximum: 5 },
        max_points: { type: "integer", minimum: 10, maximum: 18 },
      },
      required: ["title", "instructions", "sentence", "answers", "word_bank", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
  pick_many: {
    name: "make_pick_many",
    description: "Többszörös választás: válaszd ki az ÖSSZES helyes elemet egy listából.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        question: { type: "string" },
        options: { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
        correct_indices: { type: "array", minItems: 2, maxItems: 5, items: { type: "integer", minimum: 0, maximum: 7 } },
        est_minutes: { type: "integer", minimum: 2, maximum: 5 },
        max_points: { type: "integer", minimum: 10, maximum: 18 },
      },
      required: ["title", "question", "options", "correct_indices", "est_minutes", "max_points"],
      additionalProperties: false,
    },
  },
};

const CREATIVE_TYPES = ["sort_groups", "order_sequence", "true_false", "fill_blanks", "pick_many"];

const EVAL_TOOL = {
  name: "evaluate_submission",
  description: "Értékeld a diák megoldását egy írásos mini-feladatra.",
  parameters: {
    type: "object",
    properties: {
      awarded_points: { type: "integer" },
      feedback_markdown: { type: "string", description: "RÖVID (2-4 mondat) építő visszajelzés magyarul markdownban." },
    },
    required: ["awarded_points", "feedback_markdown"],
    additionalProperties: false,
  },
};

async function generateOne(KEY: string, type: string, subject: string, grade: number, dayIndex: number, exclude: string[] = []) {
  const schema = SCHEMAS[type];
  if (!schema) throw new Error("Ismeretlen típus: " + type);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content:
          `Készíts EGYETLEN "${type}" típusú mini-feladatot.\n` +
          `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nNap a kihívásban: ${dayIndex}/30\n` +
          (exclude.length ? `Kerüld ezeket a címeket: ${exclude.slice(0, 10).join(", ")}\n` : "") +
          `Legyen kreatív, érdekes, az anyaghoz illő. Magyarul.`
        },
      ],
      tools: [{ type: "function", function: schema }],
      tool_choice: { type: "function", function: { name: schema.name } },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Üres válasz");
  return JSON.parse(args);
}

function pickCreativeTypes(n: number, exclude: string[] = []) {
  const pool = CREATIVE_TYPES.filter((t) => !exclude.includes(t));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode } = body;
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    if (mode === "generate") {
      const { subject = "Általános", grade = 8, day_index = 1, recent_titles = [] } = body;
      // Fix recipe: 1 writing + 1 multiple_choice + 1 matching + 3 different creative types
      const creative3 = pickCreativeTypes(3);
      const types = ["writing", "multiple_choice", "matching", ...creative3];

      // Generate all in parallel
      const results = await Promise.allSettled(
        types.map((t) => generateOne(KEY, t, subject, grade, day_index, recent_titles))
      );

      const tasks: any[] = [];
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          tasks.push({ task_type: types[i], ...res.value });
        } else {
          console.error("Failed type:", types[i], res.reason);
        }
      });
      if (tasks.length === 0) return json({ error: "Nem sikerült feladatot generálni." }, 500);

      return json({
        day_title: `${subject} – ${day_index}. nap`,
        tasks,
      });
    }

    if (mode === "regenerate_one") {
      const { subject = "Általános", grade = 8, exclude_titles = [], task_type = "writing", day_index = 1 } = body;
      const t = task_type in SCHEMAS ? task_type : "writing";
      const result = await generateOne(KEY, t, subject, grade, day_index, exclude_titles);
      return json({ task_type: t, ...result });
    }

    if (mode === "evaluate") {
      const { subject, grade, task_title, task_prompt, submission, max_points = 20 } = body;
      if (!submission || typeof submission !== "string" || submission.trim().length < 2) {
        return json({ error: "Üres megoldás." }, 400);
      }
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM + "\nÉrtékelj objektíven, de bátorítóan." },
            { role: "user", content:
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nMaximum pont: ${max_points}\n\n` +
              `### Feladat\n**${task_title}**\n\n${task_prompt}\n\n` +
              `### Diák megoldása\n${submission}\n\n` +
              `Értékeld 0-${max_points} pont skálán és adj RÖVID (2-4 mondat) építő visszajelzést.`
            },
          ],
          tools: [{ type: "function", function: EVAL_TOOL }],
          tool_choice: { type: "function", function: { name: "evaluate_submission" } },
        }),
      });
      if (!r.ok) return upstream(r);
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Nem sikerült értékelni." }, 500);
      const parsed = JSON.parse(args);
      const capped = Math.max(0, Math.min(Number(max_points), Number(parsed.awarded_points) || 0));
      return json({ awarded_points: capped, feedback_markdown: parsed.feedback_markdown });
    }

    return json({ error: "Ismeretlen mód." }, 400);
  } catch (e) {
    console.error("challenge-task error:", e);
    return json({ error: e instanceof Error ? e.message : "Hiba" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
async function upstream(r: Response) {
  if (r.status === 429) return json({ error: "Túl sok kérés, várj egy kicsit." }, 429);
  if (r.status === 402) return json({ error: "Nincs elég kredit." }, 402);
  console.error("upstream", r.status, await r.text());
  return json({ error: "AI hiba történt." }, 500);
}
