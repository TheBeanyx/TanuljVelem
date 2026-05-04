import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "flashcards" | "notes" | "practice";
type Difficulty = "easy" | "medium" | "hard";
type Length = "short" | "medium" | "long";

const SYSTEM_PROMPT = `Te egy magyar nyelvű, lelkes és pontos AI tanár vagy a TanuljVelem platformon.
Mindig magyarul válaszolj. Tartsd a tartalmat tényszerűnek, korosztálynak megfelelőnek és érthetőnek.`;

const cardCountFor = (length: Length) =>
  length === "short" ? { min: 5, max: 6 } : length === "long" ? { min: 12, max: 15 } : { min: 8, max: 10 };

const questionCountFor = (length: Length) =>
  length === "short" ? { min: 4, max: 5 } : length === "long" ? { min: 8, max: 10 } : { min: 5, max: 8 };

const difficultyLabel = (d: Difficulty) =>
  d === "easy" ? "könnyű (alapszintű, egyszerű magyarázatok)" :
  d === "hard" ? "nehéz (részletes, kihívó, mélyebb összefüggésekkel)" :
  "közepes (átfogó, érthető szintű)";

const lengthLabelNote = (l: Length) =>
  l === "short" ? "rövid (1-2 fő szakasz, lényegre törő)" :
  l === "long" ? "hosszú (részletes, több fejezettel és példákkal)" :
  "közepes (átfogó, de tömör)";

function buildToolForMode(mode: Mode, length: Length) {
  if (mode === "flashcards") {
    const { min, max } = cardCountFor(length);
    return {
      name: "create_flashcards",
      description: `Készíts ${min}-${max} flashcardot a megadott témából.`,
      parameters: {
        type: "object",
        properties: {
          topic_title: { type: "string" },
          cards: {
            type: "array", minItems: min, maxItems: max,
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
                emoji: { type: "string" },
              },
              required: ["front", "back", "emoji"],
              additionalProperties: false,
            },
          },
        },
        required: ["topic_title", "cards"],
        additionalProperties: false,
      },
    };
  }
  if (mode === "notes") {
    return {
      name: "create_notes",
      description: "Készíts strukturált tanulási jegyzetet markdown formátumban.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          markdown: { type: "string" },
        },
        required: ["title", "markdown"],
        additionalProperties: false,
      },
    };
  }
  const { min, max } = questionCountFor(length);
  return {
    name: "create_practice_test",
    description: `Készíts ${min}-${max} feleletválasztós kérdést.`,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        questions: {
          type: "array", minItems: min, maxItems: max,
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
      required: ["title", "questions"],
      additionalProperties: false,
    },
  };
}

function userPrompt(mode: Mode, topic: string, grade: number, difficulty: Difficulty, length: Length, context?: string) {
  const meta = `Évfolyam: ${grade}. osztály\nNehézség: ${difficultyLabel(difficulty)}\nHossz: ${lengthLabelNote(length)}`;
  if (mode === "flashcards") {
    const { min, max } = cardCountFor(length);
    return `${meta}\n\nTéma: "${topic}"\n\nKészíts ${min}-${max} jól megválasztott flashcardot, az évfolyamhoz igazítva. A 'front' egy fogalom vagy rövid kérdés, a 'back' 1-3 mondatos magyarázat. Minden kártyához válassz kifejező emojit.`;
  }
  if (mode === "notes") {
    return `${meta}\n\nTéma: "${topic}"\n\n${context ? `Kapcsolódó fogalmak:\n${context}\n\n` : ""}Készíts a ${grade}. évfolyamnak megfelelő, ${lengthLabelNote(length)} tanulási jegyzetet markdown formátumban (H2 címek, listák, példák).`;
  }
  const { min, max } = questionCountFor(length);
  return `${meta}\n\nTéma: "${topic}"\n\n${context ? `Kapcsolódó fogalmak:\n${context}\n\n` : ""}Készíts ${min}-${max} kérdéses gyakorlódolgozatot a ${grade}. évfolyam szintjén, 4 válaszlehetőséggel és rövid magyarázattal.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, topic, context } = body;
    const grade = Number.isFinite(body.grade) ? Math.min(12, Math.max(1, Number(body.grade))) : 8;
    const difficulty: Difficulty = ["easy","medium","hard"].includes(body.difficulty) ? body.difficulty : "medium";
    const length: Length = ["short","medium","long"].includes(body.length) ? body.length : "medium";

    if (!mode || !topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Hiányzó vagy érvénytelen paraméter." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["flashcards", "notes", "practice"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Érvénytelen mode." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const tool = buildToolForMode(mode as Mode, length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(mode as Mode, topic, grade, difficulty, length, context) },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, várj egy kicsit." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nincs elég kredit." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI hiba történt." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Nem sikerült tartalmat generálni." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try { parsed = JSON.parse(args); }
    catch (e) {
      console.error("Parse error:", e, args);
      return new Response(JSON.stringify({ error: "Hibás AI válasz." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ mode, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("learn-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
