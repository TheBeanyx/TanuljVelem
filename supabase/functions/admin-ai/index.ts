import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPERADMIN_EMAIL = "thebeanyx11@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supa.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Only allow superadmin email OR any staff role
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPERADMIN_EMAIL;
    let allowed = isSuperAdmin;
    if (!allowed) {
      const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", user.id);
      allowed = (roles || []).length > 0;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Gather live moderation context
    const [{ data: recentMsgs }, { data: recentPosts }, { data: warnings }, { data: rules }] = await Promise.all([
      supa.from("direct_messages").select("text, is_warning, created_at").order("created_at", { ascending: false }).limit(30),
      supa.from("announcements").select("subject, message, created_at").order("created_at", { ascending: false }).limit(15),
      supa.from("direct_messages").select("text, created_at").eq("is_warning", true).order("created_at", { ascending: false }).limit(10),
      supa.from("rules").select("title, body").order("sort_order"),
    ]);

    const ctxSummary = `
LEGUTÓBBI ÜZENETEK (max 30):
${(recentMsgs || []).map((m: any) => `- ${m.is_warning ? "[WARN] " : ""}${(m.text || "").slice(0, 150)}`).join("\n")}

LEGUTÓBBI POSZTOK:
${(recentPosts || []).map((p: any) => `- ${p.subject || ""}: ${(p.message || "").slice(0, 120)}`).join("\n")}

LEGUTÓBBI FIGYELMEZTETÉSEK:
${(warnings || []).map((w: any) => `- ${(w.text || "").slice(0, 120)}`).join("\n")}

JELENLEGI SZABÁLYZAT:
${(rules || []).map((r: any) => `• ${r.title}: ${(r.body || "").slice(0, 200)}`).join("\n")}

ADMIN KONTEXT: ${context || "általános kérdés"}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Te a "TanuljVelem Admin AI" vagy — egy MODERÁCIÓS és ADMIN SEGÉD.
Csak adminok, moderátorok és staff használhat. Magyarul válaszolj, tömören, szakszerűen.

Feladataid:
- Értékelni a platform tartalmait (üzenetek, posztok) és jelezni, ha valami szabályt sért.
- Javasolni ARÁNYOS büntetéseket (figyelmeztetés → pontlevonás → felfüggesztés).
- Segíteni új szabályok megfogalmazásában, hivatalos figyelmeztetés-szövegek írásában.
- Konkrét, azonnal használható szöveget adni (pl. figyelmeztetés-sablon), ha kérik.
- Objektív maradni, jogszerű és pedagógiai szemponttal (12-18 éves diákok is használják).

Használhatsz Markdown formázást. Ha veszélyt látsz (zaklatás, önveszély utalása), külön emeld ki.

Az alábbi élő moderációs kontextus segít a döntésben:
${ctxSummary}`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Túl sok kérés." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Nincs elég kredit." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("gateway err", response.status, t);
      return new Response(JSON.stringify({ error: "AI hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("admin-ai err", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
