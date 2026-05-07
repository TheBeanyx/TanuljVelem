import { useRef, useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface DropdownItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  to: string;
  label: string;
  icon: LucideIcon;
  items: DropdownItem[];
  badge?: ReactNode;
}

const HoverNavDropdown = ({ to, label, icon: Icon, items, badge }: Props) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = items.some((i) => location.pathname === i.to) || location.pathname === to;

  const handleEnter = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link to={to}>
        <Button
          variant={isActive ? "default" : "ghost"}
          size="sm"
          className={`rounded-full gap-1.5 text-sm relative ${isActive ? "bg-primary text-primary-foreground" : ""}`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden md:inline">{label}</span>
          {badge}
        </Button>
      </Link>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 min-w-[180px]">
          <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
            {items.map((it) => {
              const ItIcon = it.icon;
              const active = location.pathname === it.to;
              return (
                <button
                  key={it.to}
                  onClick={() => { setOpen(false); navigate(it.to); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors ${active ? "bg-accent font-semibold" : ""}`}
                >
                  <ItIcon className="w-4 h-4" />
                  {it.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HoverNavDropdown;
