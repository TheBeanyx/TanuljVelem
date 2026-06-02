import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Te egy kreatív magyar tanár vagy a TanuljVelem platformon (1–12. évfolyam).
Sose adj feleletválasztós kvízt — mindig kreatív, nyitott, gondolkodtató, GYORS feladatokat tervezz.
Magyarul írj, az évfolyamhoz illő nyelvezettel, lelkesen és barátságosan.
A diáknak naponta TÖBB rövid, változatos mini-feladata legyen, NEM egy nagy esszé.`;

// Variety pool — pick different ones for each subtask
const TASK_TYPES = [
  "1 perces ötletbörze", "valós példa", "gyors magyarázat saját szóval",
  "rajzolj le és írj le 2 mondatot", "találj ki egy rejtvényt",
  "mi lenne, ha...?", "rövid párbeszéd", "fogalomtérkép 5 szóval",
  "3 érv és 3 ellenérv", "gyors összehasonlítás", "rövid története",
  "fordítsd át mindennapi nyelvre", "képzelj el egy kísérletet",
  "gyors számítás vagy becslés", "kapcsold össze a hétköznapokkal",
  "találj 3 hibát", "egészítsd ki a mondatot",
  "döntés szituációban", "mini-projekt ötlet", "kvíz a barátodnak",
];

const GEN_TOOL = {
  name: "create_daily_tasks",
  description: "Készíts 3-5 rövid, változatos kreatív mini-feladatot egy diáknak a mai napra.",
  parameters: {
    type: "object",
    properties: {
      day_title: { type: "string", description: "A nap rövid, motiváló címe (pl. 'Kreatív szerda – ötletek és példák')" },
      tasks: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Rövid, vonzó cím (max 8 szó)" },
            task_type: { type: "string", description: "A feladat típusa rövid címkeként" },
            prompt_markdown: {
              type: "string",
              description: "Tömör, konkrét feladatleírás markdownban (2-6 mondat). Mondd meg pontosan mit kell csinálni.",
            },
            est_minutes: { type: "integer", minimum: 2, maximum: 20, description: "Becsült idő percben" },
            max_points: { type: "integer", minimum: 10, maximum: 40, description: "A feladat pontértéke" },
          },
          required: ["title", "task_type", "prompt_markdown", "est_minutes", "max_points"],
          additionalProperties: false,
        },
      },
    },
    required: ["day_title", "tasks"],
    additionalProperties: false,
  },
};

const EVAL_TOOL = {
  name: "evaluate_submission",
  description: "Értékeld a diák megoldását egy mini-feladatra.",
  parameters: {
    type: "object",
    properties: {
      awarded_points: { type: "integer", description: "Adott pontszám 0-tól max_points-ig" },
      feedback_markdown: {
        type: "string",
        description: "RÖVID (2-4 mondat), építő visszajelzés magyarul markdown-ban: 1 pozitívum + 1 fejlesztési tipp.",
      },
    },
    required: ["awarded_points", "feedback_markdown"],
    additionalProperties: false,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode } = body;
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    if (mode === "generate") {
      const { subject = "Általános", grade = 8, day_index = 1, recent_titles = [], daily_goal_points = 70 } = body;
      // Pick 4 distinct type hints for variety
      const shuffled = [...TASK_TYPES].sort(() => Math.random() - 0.5);
      const typeHints = shuffled.slice(0, 5);

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content:
              `Tervezz 3-5 RÖVID, GYORS, VÁLTOZATOS kreatív mini-feladatot a mai napra.\n` +
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nNap a kihívásban: ${day_index}/30\n` +
              `A napi pontcél: ~${daily_goal_points} pont (a feladatok össz max_points-ja legyen ehhez közeli, de kicsit fölötte).\n` +
              `Minden feladat más típusú legyen — meríts ezekből (de variálj): ${typeHints.join(", ")}.\n` +
              `Kerüld ezeket a korábbi címeket: ${recent_titles.slice(0,15).join(", ") || "—"}.\n` +
              `Fontos szabályok:\n` +
              `- NE legyen feleletválasztós kvíz.\n` +
              `- Minden feladat max 2-15 perc legyen, rövid kifejtéssel.\n` +
              `- Változatosság: ne legyen mindegyik fogalmazás vagy esszé.\n` +
              `- Játékos, lendületes, korosztálynak való hangnem.`
            },
          ],
          tools: [{ type: "function", function: GEN_TOOL }],
          tool_choice: { type: "function", function: { name: "create_daily_tasks" } },
        }),
      });
      if (!r.ok) return upstream(r);
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Nem sikerült feladatot generálni." }, 500);
      const parsed = JSON.parse(args);
      return json(parsed);
    }

    if (mode === "regenerate_one") {
      const { subject = "Általános", grade = 8, exclude_titles = [], prev_type = "" } = body;
      const shuffled = [...TASK_TYPES].filter(t => t !== prev_type).sort(() => Math.random() - 0.5);
      const hint = shuffled[0];
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content:
              `Tervezz EGYETLEN rövid (3-12 perces) kreatív mini-feladatot.\n` +
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nTípus inspiráció: ${hint}\n` +
              `Kerüld ezeket: ${exclude_titles.join(", ") || "—"}.\nNE feleletválasztós!`
            },
          ],
          tools: [{ type: "function", function: {
            name: "create_one",
            description: "Egy mini-feladat.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                task_type: { type: "string" },
                prompt_markdown: { type: "string" },
                est_minutes: { type: "integer", minimum: 2, maximum: 20 },
                max_points: { type: "integer", minimum: 10, maximum: 40 },
              },
              required: ["title","task_type","prompt_markdown","est_minutes","max_points"],
              additionalProperties: false,
            },
          }}],
          tool_choice: { type: "function", function: { name: "create_one" } },
        }),
      });
      if (!r.ok) return upstream(r);
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Hiba" }, 500);
      return json(JSON.parse(args));
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
            { role: "system", content: SYSTEM + "\nÉrtékelj objektíven, de bátorítóan. Rövid, mini-feladathoz illő rövid visszajelzést adj." },
            { role: "user", content:
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nMaximum pont: ${max_points}\n\n` +
              `### Feladat\n**${task_title}**\n\n${task_prompt}\n\n` +
              `### Diák megoldása\n${submission}\n\n` +
              `Értékeld 0-${max_points} pont skálán és adj RÖVID, építő visszajelzést (2-4 mondat).`
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
