import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, Gamepad2, ClipboardList, Users, UserPlus, Bell, LogOut, MessageSquare, Megaphone, Sparkles, Brain, FileText, Trophy, NotebookPen, Bot, Flame, Library, StickyNote, Timer, Users2, CalendarDays, CalendarRange, Image as ImageIcon, MoreHorizontal } from "lucide-react";
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
      { to: "/learn", label: "Flashcard", icon: NotebookPen },
      { to: "/notes", label: "Jegyzetek", icon: StickyNote },
      { to: "/ai-tutor", label: "AI Tanár", icon: Bot },
      { to: "/pdf-analyzer", label: "PDF elemző", icon: FileText },
      { to: "/image-analyzer", label: "Kép elemző", icon: ImageIcon },
      { to: "/pomodoro", label: "Pomodoro", icon: Timer },
    ],
  },
  {
    to: "/schedule",
    label: "Órarend",
    icon: CalendarDays,
    badgeKey: null,
    dropdown: [
      { to: "/schedule", label: "Órarend", icon: CalendarDays },
      { to: "/schedule?tab=calendar", label: "Naptár", icon: CalendarRange },
      { to: "/schedule?tab=planner", label: "AI tervező", icon: Sparkles },
    ],
  },
  { to: "/materials", label: "Tananyag", icon: Library, badgeKey: null },
  { to: "/games", label: "Játékok", icon: Gamepad2, badgeKey: null },
  { to: "/tests", label: "Tesztek", icon: ClipboardList, badgeKey: null },
  { to: "/challenges", label: "Kihívás", icon: Flame, badgeKey: null },
  {
    to: "/messages",
    label: "Üzenetek",
    icon: MessageSquare,
    badgeKey: "messages" as const,
    dropdown: [
      { to: "/messages", label: "Privát üzenetek", icon: MessageSquare },
      { to: "/friends", label: "Barátok", icon: UserPlus },
      { to: "/classes", label: "Osztály", icon: Users },
      { to: "/announcements", label: "Közlemények", icon: Megaphone },
      { to: "/study-groups", label: "Tanulócsoportok", icon: Users2 },
    ],
  },
];

const extraItems = [
  {
    to: "/__more",
    label: "Egyéb",
    icon: MoreHorizontal,
    badgeKey: null,
    dropdown: [
      { to: "/notifications", label: "Értesítések", icon: Bell },
      { to: "/achievements", label: "Eredmények", icon: Trophy },
      { to: "/profile", label: "Profil & beállítások", icon: Users },
      { to: "/suggestions", label: "Javaslatok", icon: Sparkles },
      { to: "/rules", label: "Szabályzat", icon: FileText },
    ],
  },
];

const NAV_GAP = 4;
const MORE_RESERVE = 52;

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { counts } = useUnreadCounts();

  const navRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [fitCount, setFitCount] = useState(navItems.length);

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

  const measure = () => {
    const nav = navRef.current;
    const m = measureRef.current;
    if (!nav || !m) return;
    const children = Array.from(m.children) as HTMLElement[];
    if (children.length !== navItems.length) return;
    const widths = children.map((el) => el.getBoundingClientRect().width);
    const available = nav.clientWidth;
    const limit = available - MORE_RESERVE;
    let total = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] + (i > 0 ? NAV_GAP : 0);
      if (total + w <= limit) {
        total += w;
        count++;
      } else break;
    }
    setFitCount(Math.max(count, 0));
  };

  useEffect(() => {
    measure();
    const raf = { id: 0 };
    const schedule = () => {
      cancelAnimationFrame(raf.id);
      raf.id = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", schedule);
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(schedule).catch(() => {});
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overflowItems = navItems.slice(fitCount);
  const overflowHasBadge = overflowItems.some(
    (item) => item.badgeKey && counts[item.badgeKey] > 0
  );

  const renderNavItem = (item: (typeof navItems)[number]) => {
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

    return (
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
  };

  const renderMeasureClone = (item: (typeof navItems)[number]) => (
    <span key={item.to} className="inline-flex">
      <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-sm pointer-events-none">
        <item.icon className="w-4 h-4" />
        <span className="hidden md:inline">{item.label}</span>
      </Button>
    </span>
  );

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-2 max-w-full">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold hidden lg:block">TanuljVelem</span>
        </Link>

        <nav ref={navRef} className="relative flex items-center gap-1 flex-1 min-w-0 flex-nowrap">
          {/* Hidden measuring row: mirrors every nav button so widths stay measurable */}
          <div
            ref={measureRef}
            aria-hidden="true"
            className="absolute -left-[9999px] -top-[9999px] flex gap-1 pointer-events-none"
          >
            {navItems.map(renderMeasureClone)}
          </div>

          {navItems.map((item, index) => (
            <span
              key={item.to}
              className={`shrink-0 ${index >= fitCount ? "hidden" : "inline-flex"}`}
            >
              {renderNavItem(item)}
            </span>
          ))}

          {(
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full gap-1.5 text-sm relative shrink-0"
                  aria-label="Több menü"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="hidden md:inline">Több</span>
                  {overflowHasBadge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="max-h-[70vh] overflow-y-auto min-w-[200px]">
                {[...navItems, ...extraItems].map((item) => {
                  const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
                  const hasDropdown = "dropdown" in item && item.dropdown;

                  if (hasDropdown) {
                    return (
                      <Fragment key={item.to}>
                        <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </div>
                        {item.dropdown!.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive =
                            location.pathname + location.search === sub.to ||
                            location.pathname === sub.to.split("?")[0] && sub.to.split("?").length === 1;
                          return (
                            <DropdownMenuItem
                              key={sub.to}
                              onClick={() => navigate(sub.to)}
                              className={subActive ? "bg-accent font-semibold" : ""}
                            >
                              <SubIcon className="w-4 h-4 mr-2" />
                              {sub.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </Fragment>
                    );
                  }

                  if (item.to === "/games") {
                    return (
                      <Fragment key={item.to}>
                        <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </div>
                        <DropdownMenuItem onClick={() => navigate("/games")}>
                          <Gamepad2 className="w-4 h-4 mr-2" /> Játékok böngészése
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/games?create=true")}>
                          <Sparkles className="w-4 h-4 mr-2 text-chart-4" /> AI CREATE
                        </DropdownMenuItem>
                      </Fragment>
                    );
                  }

                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.to}
                      onClick={() => navigate(item.to)}
                      className={location.pathname === item.to ? "bg-accent font-semibold" : ""}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                      {badgeCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
