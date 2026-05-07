import { supabase } from "@/integrations/supabase/client";

export type BadgeId =
  | "first_steps"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "streak_100"
  | "points_100"
  | "points_500"
  | "points_1000"
  | "points_5000"
  | "test_master"
  | "test_marathon"
  | "homework_hero"
  | "homework_legend"
  | "flashcard_fan"
  | "flashcard_master"
  | "note_taker"
  | "note_scholar"
  | "pdf_explorer"
  | "pdf_pro"
  | "social_butterfly"
  | "class_collector"
  | "ai_apprentice"
  | "ai_expert"
  | "tutor_chat"
  | "chatterbox"
  | "early_bird"
  | "night_owl"
  | "weekend_warrior"
  | "comeback_kid";

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  first_steps: { id: "first_steps", name: "Első Lépések", description: "Megszerezted az első pontodat!", emoji: "👶", color: "from-emerald-400 to-teal-500" },
  streak_3: { id: "streak_3", name: "3 Napos Sorozat", description: "3 napon át tanultál egymás után", emoji: "🔥", color: "from-orange-400 to-red-500" },
  streak_7: { id: "streak_7", name: "Heti Bajnok", description: "Egy teljes hét megszakítás nélkül", emoji: "🏆", color: "from-amber-400 to-orange-600" },
  streak_14: { id: "streak_14", name: "Két Hét Hős", description: "14 napos sorozat — komoly elhivatottság", emoji: "🎖️", color: "from-amber-500 to-orange-700" },
  streak_30: { id: "streak_30", name: "Tanuló Legenda", description: "30 napos folyamatos sorozat!", emoji: "👑", color: "from-yellow-400 to-amber-600" },
  streak_100: { id: "streak_100", name: "Százas Klub", description: "100 napos megszakítás nélküli sorozat", emoji: "💯", color: "from-rose-400 to-red-700" },
  points_100: { id: "points_100", name: "100 Pont", description: "Megszerezted az első 100 pontodat", emoji: "⭐", color: "from-blue-400 to-indigo-500" },
  points_500: { id: "points_500", name: "500 Pont", description: "Komoly tanuló vagy", emoji: "🌟", color: "from-indigo-400 to-purple-500" },
  points_1000: { id: "points_1000", name: "1000 Pont Klub", description: "Belépés az elit klubba", emoji: "💎", color: "from-purple-400 to-pink-500" },
  points_5000: { id: "points_5000", name: "5000 Pont Mester", description: "Hihetetlen pontmennyiség!", emoji: "🏅", color: "from-fuchsia-500 to-rose-600" },
  test_master: { id: "test_master", name: "Teszt Mester", description: "Tökéletes pontszámot értél el egy teszten", emoji: "🎯", color: "from-pink-400 to-rose-500" },
  test_marathon: { id: "test_marathon", name: "Teszt Maraton", description: "10 tesztet teljesítettél", emoji: "🏃", color: "from-rose-500 to-pink-600" },
  homework_hero: { id: "homework_hero", name: "Házi Hős", description: "10 házi feladatot rögzítettél", emoji: "📚", color: "from-cyan-400 to-blue-500" },
  homework_legend: { id: "homework_legend", name: "Házi Legenda", description: "50 házi feladatot rögzítettél", emoji: "🎓", color: "from-cyan-500 to-blue-700" },
  flashcard_fan: { id: "flashcard_fan", name: "Kártya Rajongó", description: "5 flashcard készletet hoztál létre", emoji: "🃏", color: "from-violet-400 to-purple-600" },
  flashcard_master: { id: "flashcard_master", name: "Kártya Mester", description: "20 flashcard készlet", emoji: "🎴", color: "from-violet-500 to-fuchsia-700" },
  note_taker: { id: "note_taker", name: "Jegyzetelő", description: "5 jegyzetet írtál", emoji: "📝", color: "from-lime-400 to-green-500" },
  note_scholar: { id: "note_scholar", name: "Tudós Jegyzetelő", description: "20 jegyzet a könyvtáradban", emoji: "📓", color: "from-green-500 to-emerald-700" },
  pdf_explorer: { id: "pdf_explorer", name: "PDF Felfedező", description: "Először elemeztél egy PDF-et AI-val", emoji: "📄", color: "from-teal-400 to-emerald-500" },
  pdf_pro: { id: "pdf_pro", name: "PDF Profi", description: "10 PDF elemzés", emoji: "📑", color: "from-teal-500 to-cyan-700" },
  social_butterfly: { id: "social_butterfly", name: "Társas Lepke", description: "Csatlakoztál az első osztályodhoz", emoji: "🦋", color: "from-fuchsia-400 to-pink-500" },
  class_collector: { id: "class_collector", name: "Osztály Gyűjtő", description: "5 osztálynak vagy tagja", emoji: "🏫", color: "from-pink-500 to-rose-700" },
  ai_apprentice: { id: "ai_apprentice", name: "AI Tanonc", description: "Először használtál AI generálást", emoji: "🤖", color: "from-sky-400 to-indigo-500" },
  ai_expert: { id: "ai_expert", name: "AI Szakértő", description: "25 AI generálás", emoji: "🧠", color: "from-sky-500 to-blue-700" },
  tutor_chat: { id: "tutor_chat", name: "Kíváncsi Tanuló", description: "Először beszéltél az AI tanárral", emoji: "💬", color: "from-purple-400 to-indigo-500" },
  chatterbox: { id: "chatterbox", name: "Csevegő", description: "100 üzenetet küldtél az AI tanárnak", emoji: "🗨️", color: "from-purple-500 to-pink-600" },
  early_bird: { id: "early_bird", name: "Korán Kelő", description: "Tanultál reggel 7 előtt", emoji: "🌅", color: "from-yellow-300 to-orange-400" },
  night_owl: { id: "night_owl", name: "Éjszakai Bagoly", description: "Tanultál este 10 után", emoji: "🦉", color: "from-indigo-600 to-purple-800" },
  weekend_warrior: { id: "weekend_warrior", name: "Hétvégi Harcos", description: "Tanultál szombaton és vasárnap is", emoji: "⚔️", color: "from-red-500 to-orange-600" },
  comeback_kid: { id: "comeback_kid", name: "Visszatérő", description: "7 napos szünet után visszatértél", emoji: "🔄", color: "from-emerald-500 to-teal-700" },
};

export const POINTS = {
  daily_login: 5,
  complete_test: 20,
  perfect_test: 50,
  create_homework: 10,
  create_flashcard_set: 15,
  view_flashcards: 5,
  create_note: 10,
  pdf_analyzed: 25,
  join_class: 15,
  send_message: 2,
  ai_generation: 8,
  tutor_message: 3,
} as const;

export type PointAction = keyof typeof POINTS;

const todayISO = () => new Date().toISOString().slice(0, 10);

const daysBetween = (a: string, b: string) => {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diff / 86_400_000);
};

/**
 * Award points + update streak. Idempotent for daily login.
 * Returns newly earned badges.
 */
export async function awardPoints(userId: string, action: PointAction, metadata: Record<string, unknown> = {}): Promise<BadgeId[]> {
  const points = POINTS[action];
  const today = todayISO();

  // Fetch or create stats
  const { data: existing } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let totalPoints = (existing?.total_points ?? 0) + points;
  let currentStreak = existing?.current_streak ?? 0;
  let longestStreak = existing?.longest_streak ?? 0;
  const lastDate = existing?.last_activity_date ?? null;

  if (!lastDate) {
    currentStreak = 1;
  } else if (lastDate !== today) {
    const gap = daysBetween(lastDate, today);
    if (gap === 1) currentStreak += 1;
    else if (gap > 1) currentStreak = 1;
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  // For daily_login: skip if already logged today
  if (action === "daily_login" && lastDate === today && existing) {
    return [];
  }

  await supabase.from("user_stats").upsert({
    user_id: userId,
    total_points: totalPoints,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_activity_date: today,
  });

  await supabase.from("point_events").insert({
    user_id: userId,
    action,
    points,
    metadata: metadata as never,
  });

  // Badge checks
  const newBadges: BadgeId[] = [];
  const { data: ownedRows } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);
  const owned = new Set((ownedRows ?? []).map((r) => r.badge_id as BadgeId));

  const tryAdd = (id: BadgeId, condition: boolean) => {
    if (condition && !owned.has(id)) newBadges.push(id);
  };

  tryAdd("first_steps", totalPoints > 0);
  tryAdd("points_100", totalPoints >= 100);
  tryAdd("points_500", totalPoints >= 500);
  tryAdd("points_1000", totalPoints >= 1000);
  tryAdd("points_5000", totalPoints >= 5000);
  tryAdd("streak_3", currentStreak >= 3);
  tryAdd("streak_7", currentStreak >= 7);
  tryAdd("streak_14", currentStreak >= 14);
  tryAdd("streak_30", currentStreak >= 30);
  tryAdd("streak_100", currentStreak >= 100);
  if (action === "perfect_test") tryAdd("test_master", true);
  if (action === "pdf_analyzed") tryAdd("pdf_explorer", true);
  if (action === "join_class") tryAdd("social_butterfly", true);

  // Time-of-day badges
  const hour = new Date().getHours();
  if (hour < 7) tryAdd("early_bird", true);
  if (hour >= 22) tryAdd("night_owl", true);
  // Weekend warrior: tracked when activity on Sat (6) AND Sun (0) within current week
  const dow = new Date().getDay();
  if (dow === 0 || dow === 6) {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const { data: weekendEvents } = await supabase
      .from("point_events")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());
    const days = new Set((weekendEvents ?? []).map((e) => new Date(e.created_at as string).getDay()));
    if (days.has(0) && days.has(6)) tryAdd("weekend_warrior", true);
  }
  // Comeback: gap >= 7 between previous activity and now
  if (lastDate) {
    const gap = daysBetween(lastDate, today);
    if (gap >= 7) tryAdd("comeback_kid", true);
  }

  // Counted action badges
  const countAction = async (act: string) => {
    const { count } = await supabase
      .from("point_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", act);
    return count ?? 0;
  };

  if (action === "create_homework") {
    const c = await countAction("create_homework");
    tryAdd("homework_hero", c >= 10);
    tryAdd("homework_legend", c >= 50);
  }
  if (action === "create_flashcard_set") {
    const c = await countAction("create_flashcard_set");
    tryAdd("flashcard_fan", c >= 5);
    tryAdd("flashcard_master", c >= 20);
  }
  if (action === "create_note") {
    const c = await countAction("create_note");
    tryAdd("note_taker", c >= 5);
    tryAdd("note_scholar", c >= 20);
  }
  if (action === "complete_test" || action === "perfect_test") {
    const a = await countAction("complete_test");
    const b = await countAction("perfect_test");
    tryAdd("test_marathon", a + b >= 10);
  }
  if (action === "pdf_analyzed") {
    const c = await countAction("pdf_analyzed");
    tryAdd("pdf_pro", c >= 10);
  }
  if (action === "join_class") {
    const c = await countAction("join_class");
    tryAdd("class_collector", c >= 5);
  }
  if (action === "ai_generation") {
    const c = await countAction("ai_generation");
    tryAdd("ai_apprentice", c >= 1);
    tryAdd("ai_expert", c >= 25);
  }
  if (action === "tutor_message") {
    const c = await countAction("tutor_message");
    tryAdd("tutor_chat", c >= 1);
    tryAdd("chatterbox", c >= 100);
  }

  if (newBadges.length) {
    await supabase
      .from("user_badges")
      .insert(newBadges.map((badge_id) => ({ user_id: userId, badge_id })));
  }

  return newBadges;
}
