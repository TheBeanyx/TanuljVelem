import { supabase } from "@/integrations/supabase/client";

export type BadgeId =
  | "first_steps"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "points_100"
  | "points_500"
  | "points_1000"
  | "test_master"
  | "homework_hero"
  | "flashcard_fan"
  | "pdf_explorer"
  | "social_butterfly";

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
  streak_30: { id: "streak_30", name: "Tanuló Legenda", description: "30 napos folyamatos sorozat!", emoji: "👑", color: "from-yellow-400 to-amber-600" },
  points_100: { id: "points_100", name: "100 Pont", description: "Megszerezted az első 100 pontodat", emoji: "⭐", color: "from-blue-400 to-indigo-500" },
  points_500: { id: "points_500", name: "500 Pont", description: "Komoly tanuló vagy", emoji: "🌟", color: "from-indigo-400 to-purple-500" },
  points_1000: { id: "points_1000", name: "1000 Pont Klub", description: "Belépés az elit klubba", emoji: "💎", color: "from-purple-400 to-pink-500" },
  test_master: { id: "test_master", name: "Teszt Mester", description: "Tökéletes pontszámot értél el egy teszten", emoji: "🎯", color: "from-pink-400 to-rose-500" },
  homework_hero: { id: "homework_hero", name: "Házi Hős", description: "10 házi feladatot rögzítettél", emoji: "📚", color: "from-cyan-400 to-blue-500" },
  flashcard_fan: { id: "flashcard_fan", name: "Kártya Rajongó", description: "5 flashcard készletet hoztál létre", emoji: "🃏", color: "from-violet-400 to-purple-600" },
  pdf_explorer: { id: "pdf_explorer", name: "PDF Felfedező", description: "Először elemeztél egy PDF-et AI-val", emoji: "📄", color: "from-teal-400 to-emerald-500" },
  social_butterfly: { id: "social_butterfly", name: "Társas Lepke", description: "Csatlakoztál az első osztályodhoz", emoji: "🦋", color: "from-fuchsia-400 to-pink-500" },
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
  tryAdd("streak_3", currentStreak >= 3);
  tryAdd("streak_7", currentStreak >= 7);
  tryAdd("streak_30", currentStreak >= 30);
  if (action === "perfect_test") tryAdd("test_master", true);
  if (action === "pdf_analyzed") tryAdd("pdf_explorer", true);
  if (action === "join_class") tryAdd("social_butterfly", true);

  if (action === "create_homework") {
    const { count } = await supabase
      .from("point_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "create_homework");
    tryAdd("homework_hero", (count ?? 0) >= 10);
  }
  if (action === "create_flashcard_set") {
    const { count } = await supabase
      .from("point_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "create_flashcard_set");
    tryAdd("flashcard_fan", (count ?? 0) >= 5);
  }

  if (newBadges.length) {
    await supabase
      .from("user_badges")
      .insert(newBadges.map((badge_id) => ({ user_id: userId, badge_id })));
  }

  return newBadges;
}
