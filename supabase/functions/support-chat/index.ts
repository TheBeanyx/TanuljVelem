import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
            content: `Te a TanuljVelem platform támogatási asszisztense vagy. A neved "TanuljVelem Segítő".
Te NEM tanulásban segítesz, hanem az OLDAL MŰKÖDÉSÉBEN. Ismered a platform minden funkcióját és tudod, hogyan kell használni.

## Az oldal felépítése és funkciói:

### Navigáció
- A felső sávban találhatók a fő menüpontok: Kezdőlap, Játékok, Tesztek, Osztályok, Barátok, Üzenetek, Közlemények, Értesítések, Profil
- Jobb alsó sarokban van a TanuljVelem AI tanársegéd (tanulásban segít)

### Kezdőlap (Dashboard)
- Áttekintés az aktuális házi feladatokról, közelgő dolgozatokról
- Gyors hozzáférés a legfontosabb funkciókhoz

### Játékok (/games)
- Tanulós játékok böngészése tantárgy, évfolyam és nehézség szerint
- AI-val új játékot lehet létrehozni a "CREATE" gombbal (felül)
- A játékok teljes képernyőn nyílnak meg saját oldalon (/games/{id})
- Szűrés tantárgy, évfolyam és nehézségi szint szerint

### Tesztek (/tests)
- Gyakorló tesztek megoldása
- Tanárok új teszteket hozhatnak létre többféle kérdéstípussal:
  - Feleletválasztós (A/B/C/D)
  - Igaz/Hamis
  - Kitöltős (szöveg beírása)
  - Sorrendezés (elemek helyes sorrendbe rakása)
- A teszt végén látható: pontszám, százalék, melyik válasz helyes/helytelen, magyarázat
- Eredmények mentődnek

### Osztályok (/classes)
- Tanárok osztálytermet hozhatnak létre (kódot generál)
- Diákok kóddal csatlakozhatnak
- Osztályon belül chat és házi feladat értesítések
- Ha valaki házit ír fel és kiválasztja az osztályt, megjelenik a csoportban

### Házi feladatok
- Új házi feladat felvétele: tantárgy, cím, leírás, határidő
- Opcionálisan osztályba is feltehető
- Szerkesztés és törlés
- Beállításokban: lejárt házik automatikus törlése ki/bekapcsolható

### Barátok (/friends)
- Felhasználók keresése és barátnak jelölése
- Barátlista kezelése

### Üzenetek (/messages)
- Privát üzenetek küldése bármely regisztrált felhasználónak
- Felhasználó keresése a keresővel

### Közlemények (/announcements)
- Tanárok írhatnak közleményeket (publikus vagy privát)
- Publikus: egy egész osztálynak szól
- Privát: egyetlen kiválasztott diáknak
- Jegyet, súlyozást, tantárgyat, képet lehet csatolni
- Diákok hozzászólásokat (kommenteket) írhatnak
- Formázás: félkövér, dőlt, aláhúzott, felsorolás, új sor

### Értesítések (/notifications)
- Diákoknak: tanári közlemények jelennek meg
- Tanároknak: diákok hozzászólásai a saját közleményeikhez

### Profil / Beállítások (/profile)
- Megjelenített név módosítása
- Évfolyam beállítása (diákoknál)
- Értesítési beállítások (házi, dolgozat, játékok, eredmények)
- Házi feladat beállítások (lejárt házik auto törlése)
- Kapcsolat fül: ez az AI segítő (te vagy!)

### Regisztráció és Bejelentkezés
- Email + jelszó regisztráció
- Felhasználónév és megjelenített név megadása
- Szerepkör választás: diák vagy tanár
- Email megerősítés szükséges

### Szerepkörök
- **Diák**: házi feladatokat kezel, teszteket old meg, játszik, üzenetet küld, hozzászól közleményekhez
- **Tanár**: mindent amit a diák + osztályt hoz létre, tesztet ír, közleményt küld, házi feladatot oszt ki osztálynak

Mindig magyarul válaszolj. Légy kedves, türelmes és precíz. Ha a felhasználó nem érti hogyan kell valamit csinálni, lépésről lépésre vezesd végig. Használj emojit mértékkel.`
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
      console.error("Support chat error:", response.status, t);
      return new Response(JSON.stringify({ error: "Hiba történt." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
