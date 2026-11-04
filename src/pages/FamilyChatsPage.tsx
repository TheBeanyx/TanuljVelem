import { Users } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import FamilyChats from "@/components/FamilyChats";
import { useAuth } from "@/hooks/useAuth";

const FamilyChatsPage = () => {
  const { profile } = useAuth();
  const sub = profile?.role === "parent"
    ? "Írj privátban a gyermeked tanárának, vagy indíts hármas beszélgetést."
    : profile?.role === "teacher"
      ? "Itt látod a diákjaid szüleivel folytatott beszélgetéseket."
      : "Itt látod azokat a beszélgetéseket, ahova a szülőd és a tanárod meghívott.";
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <h1 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Szülői üzenetek</h1>
        <p className="text-sm text-muted-foreground mb-5">{sub}</p>
        <FamilyChats />
      </main>
    </div>
  );
};

export default FamilyChatsPage;
