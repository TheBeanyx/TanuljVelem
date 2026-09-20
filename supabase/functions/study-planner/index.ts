import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI kulcs nincs beállítva." }, 500);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const note: string = typeof body?.note === "string" ? body.note.slice(0, 500) : "";

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 21);
    const horizonStr = horizon.toISOString().slice(0, 10);

    const [{ data: homeworks }, { data: exams }, { data: done }, { data: timetable }, { data: events }] =
      await Promise.all([
        supabase.from("homeworks").select("id, subject, title, description, deadline").order("deadline"),
        supabase.from("exams").select("id, subject, title, topic, exam_type, exam_date").order("exam_date"),
        supabase.from("homework_completions").select("homework_id").eq("user_id", userId),
        supabase.from("timetable_entries").select("day_of_week, period, subject").order("day_of_week"),
        supabase
          .from("calendar_events")
          .select("title, event_type, event_date")
          .gte("event_date", today)
          .lte("event_date", horizonStr),
      ]);

    const doneIds = new Set((done ?? []).map((d: any) => d.homework_id));
    const openHw = (homeworks ?? []).filter((h: any) => !doneIds.has(h.id));

    const days = ["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"];

    const context = `Mai dátum: ${today}. Tervezz legfeljebb ${horizonStr}-ig.

NYITOTT HÁZI FELADATOK:
${openHw.length
        ? openHw
            .map(
              (h: any) =>
                `- id=${h.id} | ${h.subject}: ${h.title}${h.deadline ? ` | határidő: ${h.deadline}` : ""}${h.description ? ` | leírás: ${h.description}` : ""}`
            )
            .join("\n")
        : "(nincs)"}

KÖZELGŐ DOLGOZATOK:
${(exams ?? []).length
        ? exams!
            .map(
              (e: any) =>
                `- id=${e.id} | ${e.subject}: ${e.title} (${e.exam_type})${e.exam_date ? ` | dátum: ${e.exam_date}` : ""}${e.topic ? ` | téma: ${e.topic}` : ""}`
            )
            .join("\n")
        : "(nincs)"}

ÓRAREND (mely napokon van az adott tantárgy):
${(timetable ?? []).length
        ? timetable!.map((t: any) => `- ${days[(t.day_of_week ?? 1) - 1] ?? "?"} ${t.period}. óra: ${t.subject}`).join("\n")
        : "(nincs megadva)"}

EGYÉB NAPTÁRI ESEMÉNYEK:
${(events ?? []).length ? events!.map((e: any) => `- ${e.event_date}: ${e.title} (${e.event_type})`).join("\n") : "(nincs)"}

${note ? `A tanuló extra kérése: ${note}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Te tanulástervező asszisztens vagy. Magyarul dolgozol.
Feladatod: a megadott házi feladatokból és dolgozatokból ütemezz konkrét napi tanulási blokkokat.
Szabályok:
- Házi feladatot a határidő előtt legalább 1 nappal írasd meg.
- Dolgozatra a dátum előtti 3-5 napon oszd el a tanulást, több rövid blokkban.
- Naponta összesen max. 120 perc tanulás, egy blokk 20-60 perc.
- A mai napnál korábbi dátumot soha ne adj.
- Konkrétan írd le, MIT kell tanulni (téma, feladat), ne általánosságokat.
Csak a plan_study_days eszközt hívd meg.`,
          },
          { role: "user", content: context },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plan_study_days",
              description: "Napi tanulási blokkok ütemezése",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "1-3 mondatos összefoglaló a tervről" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        plan_date: { type: "string", description: "YYYY-MM-DD" },
                        title: { type: "string" },
                        subject: { type: "string" },
                        what_to_study: { type: "string" },
                        minutes: { type: "number" },
                        ref_type: { type: "string", enum: ["homework", "exam", "other"] },
                        ref_id: { type: "string", description: "a kapcsolódó házi/dolgozat id-ja, ha van" },
                      },
                      required: ["plan_date", "title", "what_to_study", "minutes", "ref_type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plan_study_days" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Túl sok kérés, próbáld újra később." }, 429);
      if (response.status === 402) return json({ error: "Nincs elég kredit." }, 402);
      console.error("AI gateway error", response.status, await response.text());
      return json({ error: "AI hiba történt." }, 500);
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "Az AI nem adott tervet." }, 500);

    let parsed: any;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return json({ error: "Az AI válasza nem értelmezhető." }, 500);
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rows = (parsed.items ?? [])
      .filter((i: any) => typeof i?.plan_date === "string" && i.plan_date >= today && i.plan_date <= horizonStr)
      .slice(0, 60)
      .map((i: any) => ({
        user_id: userId,
        plan_date: i.plan_date,
        title: String(i.title ?? "Tanulás").slice(0, 160),
        subject: i.subject ? String(i.subject).slice(0, 60) : null,
        what_to_study: i.what_to_study ? String(i.what_to_study).slice(0, 1200) : null,
        minutes: Math.max(10, Math.min(180, Number(i.minutes) || 30)),
        ref_type: ["homework", "exam", "other"].includes(i.ref_type) ? i.ref_type : "other",
        ref_id: typeof i.ref_id === "string" && uuidRe.test(i.ref_id) ? i.ref_id : null,
      }));

    if (!rows.length) return json({ error: "Nincs mit ütemezni. Írj fel házi feladatot vagy dolgozatot!" }, 400);

    await supabase.from("study_plans").delete().eq("user_id", userId).gte("plan_date", today).eq("done", false);
    const { error: insertErr } = await supabase.from("study_plans").insert(rows);
    if (insertErr) {
      console.error("insert error", insertErr);
      return json({ error: "A terv mentése nem sikerült." }, 500);
    }

    return json({ summary: parsed.summary ?? "", count: rows.length });
  } catch (e) {
    console.error("study-planner error", e);
    return json({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }, 500);
  }
});
