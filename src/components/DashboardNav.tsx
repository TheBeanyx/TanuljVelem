import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, Gamepad2, ClipboardList, Users, UserPlus, Bell, LogOut, MessageSquare, Megaphone, Sparkles, Brain, FileText, Trophy, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { resolveAvatarUrl } from "@/lib/avatars";
import StreakIndicator from "@/components/StreakIndicator";
import HoverNavDropdown from "@/components/HoverNavDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Házi Feladat", icon: BookOpen, badgeKey: null },
  {
    to: "/learn",
    label: "Tanulás",
    icon: Brain,
    badgeKey: null,
    dropdown: [
      { to: "/learn", label: "Jegyzet & Flashcard", icon: NotebookPen },
      { to: "/pdf-analyzer", label: "PDF elemző", icon: FileText },
    ],
  },
  { to: "/games", label: "Játékok", icon: Gamepad2, badgeKey: null },
  { to: "/tests", label: "Tesztek", icon: ClipboardList, badgeKey: null },
  {
    to: "/messages",
    label: "Üzenetek",
    icon: MessageSquare,
    badgeKey: "messages" as const,
    dropdown: [
      { to: "/messages", label: "Privát üzenetek", icon: MessageSquare },
      { to: "/classes", label: "Osztály", icon: Users },
    ],
  },
  { to: "/friends", label: "Barátok", icon: UserPlus, badgeKey: null },
  { to: "/announcements", label: "Közlemények", icon: Megaphone, badgeKey: null },
];

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { counts } = useUnreadCounts();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold hidden sm:block">TanuljVelem</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

            if (item.to === "/games") {
              return (
                <DropdownMenu key={item.to}>
                  <DropdownMenuTrigger asChild>
                    <Link to={item.to}>
                      <Button
                        variant={active ? "default" : "ghost"}
                        size="sm"
                        className={`rounded-full gap-1.5 text-sm relative ${active ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="hidden md:inline">{item.label}</span>
                      </Button>
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => navigate("/games")}>
                      <Gamepad2 className="w-4 h-4 mr-2" /> Játékok böngészése
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/games?create=true")}>
                      <Sparkles className="w-4 h-4 mr-2 text-chart-4" /> AI CREATE
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            if ("dropdown" in item && item.dropdown) {
              return (
                <HoverNavDropdown
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  items={item.dropdown}
                  badge={renderBadge(badgeCount)}
                />
              );
            }

              <Link key={item.to} to={item.to}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-full gap-1.5 text-sm relative ${active ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  {renderBadge(badgeCount)}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <StreakIndicator />
          <Link to="/achievements" aria-label="Eredmények">
            <Button variant="ghost" size="icon" className="rounded-full text-amber-500">
              <Trophy className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="w-5 h-5" />
              {renderBadge(counts.notifications)}
            </Button>
          </Link>
          <Link to="/profile" aria-label="Profil beállítások">
            <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-primary/40 transition-all">
              <AvatarImage src={resolveAvatarUrl(profile?.avatar_url) ?? undefined} alt={profile?.display_name || profile?.username || "profil"} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(profile?.display_name || profile?.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border ml-2">
            <span className="text-sm font-semibold">{profile?.display_name || profile?.username || "..."}</span>
            {profile?.role === "teacher" && <Badge variant="secondary" className="text-xs">Tanár</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;
