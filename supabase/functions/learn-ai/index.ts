import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "flashcards" | "notes" | "practice";

const SYSTEM_PROMPT = `Te egy magyar nyelvű, lelkes és pontos AI tanár vagy a TanuljVelem platformon.
Mindig magyarul válaszolj. Tartsd a tartalmat tényszerűnek, korosztálynak megfelelőnek és érthetőnek.`;

function buildToolForMode(mode: Mode) {
  if (mode === "flashcards") {
    return {
      name: "create_flashcards",
      description:
        "Készíts 8-10 flashcardot a megadott témából. Minden kártyán egy fogalom (front) és annak tömör magyarázata (back).",
      parameters: {
        type: "object",
        properties: {
          topic_title: { type: "string", description: "A téma rövid címe" },
          cards: {
            type: "array",
            minItems: 6,
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                front: { type: "string", description: "Fogalom vagy kérdés" },
                back: { type: "string", description: "Tömör magyarázat (1-3 mondat)" },
                emoji: { type: "string", description: "Egy releváns emoji" },
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
      description:
        "Készíts strukturált tanulási jegyzetet a megadott témából. A jegyzet markdown formátumú legyen.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          markdown: {
            type: "string",
            description:
              "Teljes markdown jegyzet: H2 címek, bekezdések, listák, példák. Magyar nyelven.",
          },
        },
        required: ["title", "markdown"],
        additionalProperties: false,
      },
    };
  }
  // practice test
  return {
    name: "create_practice_test",
    description:
      "Készíts 5-8 feleletválasztós kérdést a megadott témából, A-D válaszlehetőségekkel és magyarázattal.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 8,
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
            required: [
              "question",
              "option_a",
              "option_b",
              "option_c",
              "option_d",
              "correct_answer",
              "explanation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "questions"],
      additionalProperties: false,
    },
  };
}

function userPromptForMode(mode: Mode, topic: string, context?: string) {
  if (mode === "flashcards") {
    return `Téma: "${topic}"\n\nKészíts 8-10 jól megválasztott flashcardot. A 'front' tartalmazzon egy fogalmat vagy rövid kérdést, a 'back' pedig 1-3 mondatos pontos magyarázatot. Válassz kifejező emojit minden kártyához.`;
  }
  if (mode === "notes") {
    return `A diák épp az alábbi témát tanulta flashcardokkal:\n"${topic}"\n\n${
      context ? `A flashcardok tartalma:\n${context}\n\n` : ""
    }Készíts ebből egy átfogó, jól strukturált tanulási jegyzetet markdown formátumban.`;
  }
  return `A diák az alábbi témát tanulta:\n"${topic}"\n\n${
    context ? `A flashcardok tartalma:\n${context}\n\n` : ""
  }Készíts egy 5-8 kérdéses gyakorlódolgozatot, mindegyik kérdésnél 4 válaszlehetőséggel és rövid magyarázattal.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, topic, context } = await req.json();
    if (!mode || !topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Hiányzó vagy érvénytelen paraméter." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["flashcards", "notes", "practice"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Érvénytelen mode." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const tool = buildToolForMode(mode as Mode);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPromptForMode(mode as Mode, topic, context) },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, várj egy kicsit." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nincs elég kredit." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI hiba történt." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Nem sikerült tartalmat generálni." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(args);
    } catch (e) {
      console.error("Parse error:", e, args);
      return new Response(JSON.stringify({ error: "Hibás AI válasz." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
