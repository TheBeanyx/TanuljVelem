import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Te egy magyar nyelvű, türelmes és lelkes AI tanár vagy a TanuljVelem platformon (1-12. évfolyam).
- Mindig magyarul válaszolj.
- Ha a diák egy fogalmat vagy témakört kér, magyarázd el korosztályának megfelelően, példákkal.
- Használj markdown formázást: címek, listák, **kiemelés**, kódblokkok, képletek.
- Ha valami nem világos, kérdezz vissza.
- Légy bátorító és barátságos.`;

const TEST_TOOL = {
  name: "create_test",
  description: "Készíts egy gyakorlótesztet a megadott témából 4 válaszos kérdésekkel.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "A teszt címe" },
      subject: { type: "string", description: "Tantárgy neve, pl. Matematika, Történelem" },
      grade: { type: "integer", minimum: 1, maximum: 12 },
      questions: {
        type: "array", minItems: 5, maxItems: 10,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            option_a: { type: "string" },
            option_b: { type: "string" },
            option_c: { type: "string" },
            option_d: { type: "string" },
            correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
            explanation: { type: "string" },
          },
          required: ["question","option_a","option_b","option_c","option_d","correct_answer","explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "subject", "grade", "questions"],
    additionalProperties: false,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, messages, topic, grade, subject, creator_name } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // ===== TEST GENERATION =====
    if (mode === "test") {
      if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
        return json({ error: "Adj meg egy témát." }, 400);
      }
      const g = Number.isFinite(grade) ? Math.min(12, Math.max(1, Number(grade))) : 8;
      const subj = typeof subject === "string" && subject.trim() ? subject : "Általános";

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Készíts ${g}. évfolyamos gyakorlótesztet a következő témáról: "${topic}". Tantárgy: ${subj}. 6-8 kérdés, 4 válaszlehetőséggel és rövid magyarázattal.` },
          ],
          tools: [{ type: "function", function: TEST_TOOL }],
          tool_choice: { type: "function", function: { name: "create_test" } },
        }),
      });

      if (!r.ok) return upstreamError(r);
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Nem sikerült tesztet generálni." }, 500);

      let parsed: any;
      try { parsed = JSON.parse(args); } catch { return json({ error: "Hibás AI válasz." }, 500); }

      // Save to tests table
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: test, error: testErr } = await supabase.from("tests").insert({
        title: parsed.title,
        subject: parsed.subject || subj,
        grade: parsed.grade || g,
        time_limit_minutes: 30,
        creator_name: creator_name || "AI Tanár",
        is_system: false,
      }).select().single();

      if (testErr || !test) {
        console.error("test insert", testErr);
        return json({ error: "Nem sikerült menteni a tesztet." }, 500);
      }

      const qRows = (parsed.questions || []).map((q: any, i: number) => ({
        test_id: test.id,
        question: q.question,
        question_type: "multiple_choice",
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        sort_order: i + 1,
      }));
      await supabase.from("test_questions").insert(qRows);

      return json({ mode: "test", test_id: test.id, title: parsed.title, count: qRows.length });
    }

    // ===== EXPLAIN / CHAT =====
    if (!Array.isArray(messages)) return json({ error: "Hiányzó messages." }, 400);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          ...messages.slice(-20).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!r.ok) return upstreamError(r);
    return new Response(r.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return json({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
async function upstreamError(r: Response) {
  if (r.status === 429) return json({ error: "Túl sok kérés, várj egy kicsit." }, 429);
  if (r.status === 402) return json({ error: "Nincs elég kredit." }, 402);
  console.error("upstream", r.status, await r.text());
  return json({ error: "AI hiba történt." }, 500);
}
