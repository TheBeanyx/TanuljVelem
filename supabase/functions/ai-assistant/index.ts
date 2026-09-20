import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the user's personal homework / exam context (RLS-scoped by their own token)
    let userContext = "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (token && SUPABASE_URL && ANON_KEY && token !== ANON_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const [{ data: homeworks }, { data: exams }, { data: done }] = await Promise.all([
            supabase
              .from("homeworks")
              .select("id, subject, title, description, deadline")
              .order("deadline", { ascending: true })
              .limit(40),
            supabase
              .from("exams")
              .select("subject, title, topic, exam_type, exam_date")
              .order("exam_date", { ascending: true })
              .limit(40),
            supabase.from("homework_completions").select("homework_id").eq("user_id", userData.user.id),
          ]);

          const doneIds = new Set((done ?? []).map((d: any) => d.homework_id));
          const hwLines = (homeworks ?? []).map((h: any) =>
            `- [${doneIds.has(h.id) ? "KÉSZ" : "AKTÍV"}] ${h.subject}: ${h.title}${h.deadline ? ` (határidő: ${h.deadline})` : ""}${h.description ? ` — leírás: ${h.description}` : ""}`
          );
          const exLines = (exams ?? []).map((e: any) =>
            `- ${e.subject}: ${e.title} (${e.exam_type}${e.exam_date ? `, ${e.exam_date}` : ""})${e.topic ? ` — téma: ${e.topic}` : ""}`
          );

          const today = new Date().toISOString().slice(0, 10);
          userContext = `\n\nA FELHASZNÁLÓ SAJÁT ADATAI (mai dátum: ${today}). Ezeket ismered, ezekre hivatkozhatsz:

HÁZI FELADATOK:
${hwLines.length ? hwLines.join("\n") : "(nincs felírt házi feladat)"}

DOLGOZATOK:
${exLines.length ? exLines.join("\n") : "(nincs felírt dolgozat)"}

Ha a felhasználó a házijáról vagy dolgozatáról kérdez (pl. "mi a házim", "magyarázd el a biológia házimat"), a fenti listából azonosítsd a megfelelő tételt, és arról beszélj. Ha nem találsz megfelelőt, mondd meg, hogy nincs ilyen felírva.`;
        }
      } catch (ctxErr) {
        console.error("context fetch error:", ctxErr);
      }
    }


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Te a "TanuljVelem AI" tanársegéd vagy. Magyarul válaszolj.

FONTOS STÍLUSSZABÁLYOK:
- A válaszod HOSSZA igazodjon a kérdés hosszához. Rövid kérdésre rövid válasz.
- Egy köszönésre csak köszönj vissza egy mondatban. Ne adj plusz infót.
- Csak akkor magyarázz hosszan, ha kifejezetten kérik.
- Ne ismételd magad. Ne foglald össze a válaszodat a végén.
- Használhatsz Markdown formázást (félkövér, dőlt, lista, kódblokk, címek).

Témád: tanulás, házi, tantárgyak, motiváció. Légy kedves és bátorító. Emoji mértékkel.${userContext}`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Túl sok kérés, próbáld újra később." }), {
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
