import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Te egy kreatív magyar tanár vagy a TanuljVelem platformon (1–12. évfolyam).
Sose adj feleletválasztós kvízt — mindig kreatív, nyitott, gondolkodtató feladatot tervezz.
Magyarul írj, az évfolyamhoz illő nyelvezettel, lelkesen és barátságosan.`;

const TASK_TYPES = [
  "fogalmazás", "rövid esszé", "kreatív történet", "rajzleírás",
  "gondolatkísérlet", "kutatási mini-projekt", "valós példák gyűjtése",
  "magyarázat saját szavakkal", "összehasonlítás", "érvelés",
  "interjú vagy párbeszéd írása", "kísérletterv", "vita-érvek",
  "fogalomtérkép", "életszerű feladat (real-life problem)",
];

const GEN_TOOL = {
  name: "create_creative_task",
  description: "Kreatív, nyitott napi feladat egy diáknak.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Rövid, vonzó cím" },
      task_type: { type: "string", description: "A feladat típusa" },
      prompt_markdown: {
        type: "string",
        description: "Részletes feladatleírás markdown-ban: kontextus, mit kell csinálni, elvárt terjedelem, értékelési szempontok.",
      },
      max_points: { type: "integer", minimum: 50, maximum: 150, description: "A mai elérhető pontszám (kb. 50–150 között, a feladat nehézségétől függően)" },
    },
    required: ["title", "task_type", "prompt_markdown", "max_points"],
    additionalProperties: false,
  },
};

const EVAL_TOOL = {
  name: "evaluate_submission",
  description: "Értékeld a diák kreatív megoldását.",
  parameters: {
    type: "object",
    properties: {
      awarded_points: { type: "integer", description: "Adott pontszám 0-tól max_points-ig" },
      feedback_markdown: {
        type: "string",
        description: "Részletes, építő visszajelzés magyarul markdown-ban: erősségek, fejlesztendők, javaslat.",
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
      const { subject = "Általános", grade = 8, day_index = 1, recent_titles = [] } = body;
      const seed = `${subject}-${grade}-${new Date().toISOString().slice(0,10)}`;
      const typeHint = TASK_TYPES[Math.floor((day_index + seed.length) % TASK_TYPES.length)];

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content:
              `Tervezz egy NAPI KREATÍV feladatot.\n` +
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nNap a kihívásban: ${day_index}/30\n` +
              `Ajánlott feladattípus (de szabadon térj el): ${typeHint}\n` +
              `Kerüld ezeket a korábbi feladatokat: ${recent_titles.slice(0,10).join(", ") || "—"}.\n` +
              `Fontos: NE feleletválasztós kvíz legyen, hanem kreatív, nyitott, kifejtős feladat.`
            },
          ],
          tools: [{ type: "function", function: GEN_TOOL }],
          tool_choice: { type: "function", function: { name: "create_creative_task" } },
        }),
      });
      if (!r.ok) return upstream(r);
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Nem sikerült feladatot generálni." }, 500);
      const parsed = JSON.parse(args);
      return json(parsed);
    }

    if (mode === "evaluate") {
      const { subject, grade, task_title, task_prompt, submission, max_points = 100 } = body;
      if (!submission || typeof submission !== "string" || submission.trim().length < 3) {
        return json({ error: "Üres megoldás." }, 400);
      }
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM + "\nÉrtékelj objektíven, de bátorítóan. A pontszám a feladat teljesítésének minőségét tükrözze." },
            { role: "user", content:
              `Tantárgy: ${subject}\nÉvfolyam: ${grade}\nMaximum pont: ${max_points}\n\n` +
              `### Feladat\n**${task_title}**\n\n${task_prompt}\n\n` +
              `### Diák megoldása\n${submission}\n\n` +
              `Értékeld 0-${max_points} pont skálán és adj részletes, építő visszajelzést.`
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
