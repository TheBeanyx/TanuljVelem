import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Te egy magyar AI tanár vagy a TanuljVelem platformon (1-12. évfolyam).

STÍLUS:
- A válasz hossza igazodjon a kérdéshez. Rövid kérdésre rövid válasz, köszönésre csak köszönj vissza.
- Csak akkor magyarázz hosszan/példákkal, ha témakör/fogalom magyarázatot kérnek.
- Ne ismételd magad, ne tegyél bevezetőt és záró összefoglalót.
- Légy barátságos, bátorító, kérdezz vissza ha kell.

FORMÁZÁS (GitHub-flavored Markdown támogatott):
- Használj **kiemelést**, listákat, címeket, idézeteket, feladatlistákat (- [ ]).
- TÁBLÁZATOKAT bátran használj összehasonlításhoz, adatokhoz, ragozáshoz, képletekhez (| fejléc | ... | szintaxis).
- Kódot nyelv-jelöléssel adj meg (\`\`\`python, \`\`\`js).

INTERAKTÍV TARTALOM ÉS ANIMÁCIÓK:
- Ha a magyarázat szemléltetést, animációt, diagramot, szimulációt vagy interaktív játékot igényel (vagy a diák kéri),
  írj EGY \`\`\`html kódblokkot: teljes, önálló HTML + CSS + <script> (külső könyvtár nélkül).
  Ezt a platform automatikusan lefuttatja és megjeleníti a diáknak.
- Az animációk legyenek CSS/canvas alapúak, reszponzívak (max-width:100%), magyar feliratokkal.
- Egy válaszban legfeljebb 1-2 ilyen blokk legyen, és mellé rövid magyarázat.

LÉTREHOZÁS:
- Ha a diák tesztet, kvízt, igaz/hamis feladatot, jegyzetet vagy flashcardot kér, mondd el neki hogy a
  "Létrehozás" gombbal (fent) egy kattintással elmentheted neki — vagy ha már megadta a témát, foglald össze röviden mit fogsz készíteni.`;

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
        type: "array", minItems: 5, maxItems: 12,
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

const TF_TOOL = {
  name: "create_true_false",
  description: "Készíts igaz/hamis feladatsort a megadott témából.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      subject: { type: "string" },
      grade: { type: "integer", minimum: 1, maximum: 12 },
      statements: {
        type: "array", minItems: 6, maxItems: 12,
        items: {
          type: "object",
          properties: {
            statement: { type: "string" },
            is_true: { type: "boolean" },
            explanation: { type: "string" },
          },
          required: ["statement", "is_true", "explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "subject", "grade", "statements"],
    additionalProperties: false,
  },
};

const NOTE_TOOL = {
  name: "create_note",
  description: "Készíts egy tanulási jegyzetet/vázlatot markdownban (címek, listák, táblázatok engedélyezettek).",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      markdown: { type: "string", description: "A jegyzet teljes tartalma markdownban, táblázatokkal ahol hasznos." },
    },
    required: ["title", "markdown"],
    additionalProperties: false,
  },
};

const FLASHCARD_TOOL = {
  name: "create_flashcards",
  description: "Készíts tanulókártyákat (flashcard) a témából.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      cards: {
        type: "array", minItems: 6, maxItems: 20,
        items: {
          type: "object",
          properties: {
            front: { type: "string", description: "Kérdés / fogalom (rövid)." },
            back: { type: "string", description: "Válasz / meghatározás (rövid)." },
            emoji: { type: "string", description: "Egy illő emoji." },
          },
          required: ["front", "back", "emoji"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "cards"],
    additionalProperties: false,
  },
};

const MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, messages, topic, grade, subject, creator_name, user_id, difficulty } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const admin = () => createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const g = Number.isFinite(grade) ? Math.min(12, Math.max(1, Number(grade))) : 8;
    const subj = typeof subject === "string" && subject.trim() ? subject : "Általános";
    const diff = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";

    const needTopic = ["test", "true_false", "note", "flashcards"].includes(mode);
    if (needTopic && (!topic || typeof topic !== "string" || topic.trim().length < 2)) {
      return json({ error: "Adj meg egy témát." }, 400);
    }

    const callTool = async (tool: any, prompt: string) => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          tools: [{ type: "function", function: tool }],
          tool_choice: { type: "function", function: { name: tool.name } },
        }),
      });
      if (!r.ok) return { err: await upstreamError(r) };
      const data = await r.json();
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { err: json({ error: "Nem sikerült generálni." }, 500) };
      try { return { parsed: JSON.parse(args) }; } catch { return { err: json({ error: "Hibás AI válasz." }, 500) }; }
    };

    const saveTest = async (title: string, questions: any[]) => {
      const supabase = admin();
      const { data: test, error: testErr } = await supabase.from("tests").insert({
        title,
        subject: subj,
        grade: g,
        time_limit_minutes: 30,
        creator_name: creator_name || "AI Tanár",
        is_system: false,
      }).select().single();
      if (testErr || !test) {
        console.error("test insert", testErr);
        return null;
      }
      await supabase.from("test_questions").insert(questions.map((q, i) => ({ ...q, test_id: test.id, sort_order: i + 1 })));
      return test.id as string;
    };

    // ===== TEST GENERATION =====
    if (mode === "test") {
      const { parsed, err } = await callTool(
        TEST_TOOL,
        `Készíts ${g}. évfolyamos, ${diff} nehézségű gyakorlótesztet a következő témáról: "${topic}". Tantárgy: ${subj}. 8-10 kérdés, 4 válaszlehetőséggel és rövid magyarázattal.`,
      );
      if (err) return err;
      const testId = await saveTest(parsed.title, (parsed.questions || []).map((q: any) => ({
        question: q.question,
        question_type: "multiple_choice",
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      })));
      if (!testId) return json({ error: "Nem sikerült menteni a tesztet." }, 500);
      return json({ mode, test_id: testId, title: parsed.title, count: (parsed.questions || []).length });
    }

    // ===== TRUE / FALSE =====
    if (mode === "true_false") {
      const { parsed, err } = await callTool(
        TF_TOOL,
        `Készíts ${g}. évfolyamos, ${diff} nehézségű IGAZ/HAMIS feladatsort a témáról: "${topic}". Tantárgy: ${subj}. 8-10 állítás, felé-felé igaz és hamis, rövid magyarázattal.`,
      );
      if (err) return err;
      const testId = await saveTest(parsed.title, (parsed.statements || []).map((s: any) => ({
        question: s.statement,
        question_type: "true_false",
        option_a: "Igaz", option_b: "Hamis", option_c: "-", option_d: "-",
        correct_answer: s.is_true ? "A" : "B",
        explanation: s.explanation,
      })));
      if (!testId) return json({ error: "Nem sikerült menteni." }, 500);
      return json({ mode, test_id: testId, title: parsed.title, count: (parsed.statements || []).length });
    }

    // ===== NOTE =====
    if (mode === "note") {
      if (!user_id) return json({ error: "Jelentkezz be." }, 401);
      const { parsed, err } = await callTool(
        NOTE_TOOL,
        `Készíts ${g}. évfolyamos, ${diff} nehézségű tanulási jegyzetet/vázlatot a témáról: "${topic}". Tantárgy: ${subj}. Használj címeket, listákat és legalább egy táblázatot ha értelmes. Magyarul.`,
      );
      if (err) return err;
      const supabase = admin();
      const { data, error } = await supabase.from("learn_notes").insert({
        owner_id: user_id,
        title: parsed.title,
        markdown: parsed.markdown,
        topic,
        grade: g,
        visibility: "private",
        length: "medium",
        difficulty: diff,
        source: "ai",
      }).select().single();
      if (error) { console.error(error); return json({ error: "Nem sikerült menteni a jegyzetet." }, 500); }
      return json({ mode, note_id: data.id, title: parsed.title });
    }

    // ===== FLASHCARDS =====
    if (mode === "flashcards") {
      if (!user_id) return json({ error: "Jelentkezz be." }, 401);
      const { parsed, err } = await callTool(
        FLASHCARD_TOOL,
        `Készíts ${g}. évfolyamos, ${diff} nehézségű tanulókártyákat (flashcard) a témáról: "${topic}". Tantárgy: ${subj}. 10-14 kártya, rövid elő- és hátlappal. Magyarul.`,
      );
      if (err) return err;
      const supabase = admin();
      const { data: set, error } = await supabase.from("flashcard_sets").insert({
        owner_id: user_id,
        title: parsed.title,
        topic,
        grade: g,
        visibility: "private",
        length: "medium",
        difficulty: diff,
        source: "ai",
      }).select().single();
      if (error || !set) { console.error(error); return json({ error: "Nem sikerült menteni a szettet." }, 500); }
      await supabase.from("flashcard_items").insert(
        (parsed.cards || []).map((c: any, i: number) => ({
          set_id: set.id, front: c.front, back: c.back, emoji: c.emoji, sort_order: i + 1,
        })),
      );
      return json({ mode, set_id: set.id, title: parsed.title, count: (parsed.cards || []).length });
    }

    // ===== EXPLAIN / CHAT =====
    if (!Array.isArray(messages)) return json({ error: "Hiányzó messages." }, 400);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
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
