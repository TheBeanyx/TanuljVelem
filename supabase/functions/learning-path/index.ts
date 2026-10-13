import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "AI kulcs hiányzik." }, 500);
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = auth.slice(7).trim();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 200) : "";
    const material = typeof body.material === "string" ? body.material.slice(0, 15000) : "";
    const subject = typeof body.subject === "string" ? body.subject.slice(0, 60) : "";
    const grade = Math.min(12, Math.max(1, Number(body.grade) || 8));
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";
    const unitCount = Math.min(5, Math.max(2, Number(body.units) || 3));
    if (topic.length < 2 && material.trim().length < 30) {
      return json({ error: "Adj meg témát vagy tölts fel tananyagot." }, 400);
    }

    const exercise = {
      type: "object",
      properties: {
        type: { type: "string", enum: ["mcq", "true_false", "fill_blank"] },
        prompt: { type: "string" },
        options: { type: "array", items: { type: "string" }, description: "mcq: 3-4 opció; true_false: ['Igaz','Hamis']; fill_blank: üres" },
        answer: { type: "string", description: "A helyes válasz pontos szövege (fill_blank: 1-2 szó)" },
        explanation: { type: "string" },
      },
      required: ["type", "prompt", "options", "answer", "explanation"],
      additionalProperties: false,
    };

    const prompt = `Évfolyam: ${grade}. osztály. Nehézség: ${difficulty}. Tantárgy: ${subject || "nincs megadva"}.
Téma: ${topic || "(a tananyag alapján)"}
${material ? `TANANYAG (csak ebből dolgozz):\n"""${material}"""` : ""}

Készíts Duolingo-szerű tanulási ösvényt ${unitCount} egységgel, egységenként 3-4 rövid leckével.
Minden lecke: rövid magyarázat (teach, markdown, 3-6 mondat, egy kulcsfogalomra fókuszálva), majd 4-6 vegyes gyakorlófeladat, amely épp a magyarázott anyagot gyakoroltatja. Lépésről lépésre haladj az egyszerűtől a nehezebb felé.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Magyar nyelvű, pontos, bátorító AI tanár vagy. Mindig magyarul írj." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_path",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                units: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      lessons: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            teach: { type: "string" },
                            exercises: { type: "array", items: exercise },
                          },
                          required: ["title", "teach", "exercises"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["title", "lessons"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "units"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_path" } },
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "Túl sok kérés, várj egy kicsit." }, 429);
      if (r.status === 402) return json({ error: "Nincs elég kredit." }, 402);
      console.error("gateway", r.status, await r.text());
      return json({ error: "AI hiba történt." }, 500);
    }
    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any;
    try { parsed = JSON.parse(args); } catch { return json({ error: "Hibás AI válasz." }, 500); }

    const units = (parsed.units ?? []).slice(0, 6).map((u: any, ui: number) => ({
      title: String(u.title ?? `${ui + 1}. egység`),
      lessons: (u.lessons ?? []).slice(0, 5).map((l: any, li: number) => ({
        id: `u${ui}-l${li}`,
        title: String(l.title ?? "Lecke"),
        teach: String(l.teach ?? ""),
        exercises: (l.exercises ?? []).filter((e: any) => e?.prompt && e?.answer).slice(0, 8),
      })).filter((l: any) => l.exercises.length),
    })).filter((u: any) => u.lessons.length);
    if (!units.length) return json({ error: "Nem sikerült ösvényt készíteni." }, 500);

    const { data: row, error } = await supabase.from("learning_paths").insert({
      user_id: userId,
      title: String(parsed.title || topic || "Tanulási ösvény").slice(0, 160),
      subject: subject || null,
      grade,
      units,
    }).select("id").single();
    if (error) { console.error(error); return json({ error: "Mentés nem sikerült." }, 500); }
    return json({ id: row.id });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }, 500);
  }
});
