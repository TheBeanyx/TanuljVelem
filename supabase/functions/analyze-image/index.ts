import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Te egy magyar nyelvű, segítőkész AI tanár vagy a TanuljVelem platformon.
Képeket elemzel (tankönyvi oldal, jegyzet, feladatlap, ábra, fotó).
Mindig magyarul válaszolj, Markdown formázással (címek, listák, táblázatok, LaTeX helyett egyszerű jelölés).
Legyél tömör és lényegre törő, ne írj feleslegesen hosszan.`;

const modePrompt = (mode: string, grade: number, question: string) => {
  const g = `A tanuló ${grade}. osztályos, ehhez igazítsd a nyelvezetet.`;
  switch (mode) {
    case "solve":
      return `${g} Oldd meg a képen látható feladato(ka)t lépésenként, és a végén add meg a végeredményt kiemelve.`;
    case "explain":
      return `${g} Magyarázd el egyszerűen, amit a kép tartalmaz. Használj példát és rövid összefoglalót a végén.`;
    case "notes":
      return `${g} Készíts a képen látható tartalomból rendezett vázlatot (címek, felsorolások, kulcsfogalmak félkövéren).`;
    case "text":
      return `Írd le pontosan a képen olvasható szöveget (átírás). Ha kézírás, jelöld a bizonytalan részeket [?]-lel.`;
    case "question":
      return `${g} Válaszolj a kép alapján erre a kérdésre: "${question || "Mi látható a képen?"}"`;
    default:
      return `${g} Írd le részletesen, mi látható a képen, és mi a tanulságos benne.`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image, mode = "describe", grade = 8, question = "" } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Hiányzó vagy hibás kép." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Nincs beállítva az AI kulcs." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: modePrompt(String(mode), Number(grade) || 8, String(question)) },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld pár másodperc múlva." }), {
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
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return new Response(JSON.stringify({ error: "Nem sikerült elemzést készíteni." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ markdown: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
