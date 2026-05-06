import { Flame, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";

const StreakIndicator = () => {
  const { stats } = useGamification();
  if (!stats) return null;

  return (
    <Link
      to="/achievements"
      className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
      title="Eredmények megtekintése"
    >
      <span className="flex items-center gap-1 text-sm font-bold text-orange-600 dark:text-orange-400">
        <Flame className="w-4 h-4" />
        {stats.current_streak}
      </span>
      <span className="w-px h-4 bg-border" />
      <span className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
        <Star className="w-4 h-4 fill-current" />
        {stats.total_points}
      </span>
    </Link>
  );
};

export default StreakIndicator;
