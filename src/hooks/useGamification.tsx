import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { awardPoints, BADGES, BadgeId, PointAction } from "@/lib/gamification";
import { toast } from "@/hooks/use-toast";

export interface UserStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export const useGamification = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<BadgeId[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStats(null);
      setBadges([]);
      setLoading(false);
      return;
    }
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
    ]);
    setStats(
      s
        ? {
            total_points: s.total_points,
            current_streak: s.current_streak,
            longest_streak: s.longest_streak,
            last_activity_date: s.last_activity_date,
          }
        : { total_points: 0, current_streak: 0, longest_streak: 0, last_activity_date: null }
    );
    setBadges((b ?? []).map((r) => r.badge_id as BadgeId));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Daily login award
  useEffect(() => {
    if (!user) return;
    awardPoints(user.id, "daily_login").then((newBadges) => {
      if (newBadges.length) showBadgeToasts(newBadges);
      refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const award = useCallback(
    async (action: PointAction, metadata?: Record<string, unknown>) => {
      if (!user) return;
      const newBadges = await awardPoints(user.id, action, metadata);
      if (newBadges.length) showBadgeToasts(newBadges);
      refresh();
    },
    [user, refresh]
  );

  return { stats, badges, loading, refresh, award };
};

function showBadgeToasts(ids: BadgeId[]) {
  ids.forEach((id) => {
    const b = BADGES[id];
    if (!b) return;
    toast({
      title: `${b.emoji} Új jelvény: ${b.name}`,
      description: b.description,
    });
  });
}
