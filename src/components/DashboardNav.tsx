import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, Gamepad2, ClipboardList, Users, UserPlus, Bell, Settings, LogOut, MessageSquare, Megaphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Házi Feladat", icon: BookOpen },
  { to: "/games", label: "Játékok", icon: Gamepad2 },
  { to: "/tests", label: "Tesztek", icon: ClipboardList },
  { to: "/classes", label: "Osztályok", icon: Users },
  { to: "/friends", label: "Barátok", icon: UserPlus },
  { to: "/messages", label: "Üzenetek", icon: MessageSquare },
  { to: "/announcements", label: "Közlemények", icon: Megaphone },
];

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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
            return (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-full gap-1.5 text-sm ${active ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="w-5 h-5" />
            </Button>
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
