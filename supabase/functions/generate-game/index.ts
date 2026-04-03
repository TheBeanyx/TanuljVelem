import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, subject, grade, difficulty } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Kérlek adj meg egy részletes játékleírást (min. 5 karakter)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert HTML5 game developer. The user will describe a game idea. You must generate a COMPLETE, SINGLE-FILE HTML page containing an interactive educational game.

RULES:
- Output ONLY the HTML code, nothing else. No markdown, no explanation.
- The game must be fully contained in one HTML file with inline CSS and JavaScript.
- Use a <canvas> element or DOM elements for the game.
- The game MUST be educational, related to the subject: ${subject || "Általános"}, for grade ${grade || 5}.
- Difficulty: ${difficulty || "Közepes"}
- Use Hungarian language for all visible text in the game.
- Make it visually appealing with colors, animations, and clear UI.
- Include a score counter, instructions, and a restart button.
- The game must be interactive and playable immediately on load.
- Use modern CSS (flexbox/grid) and vanilla JS only (no external libraries).
- Make sure it works in an iframe.
- Set body margin to 0 and make the game fill the entire viewport.
- Use a clean, modern color scheme (dark backgrounds with vibrant accents).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Készíts egy játékot: ${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nincs elég kredit. Töltsd fel az egyenleged." }), {
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
    let htmlCode = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    htmlCode = htmlCode.replace(/^```html?\s*/i, "").replace(/```\s*$/, "").trim();

    // Extract title from the HTML
    const titleMatch = htmlCode.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "AI Játék";

    return new Response(JSON.stringify({ html: htmlCode, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-game error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
