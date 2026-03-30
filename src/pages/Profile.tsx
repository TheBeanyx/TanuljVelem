import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user") || '{"username":"Demo","displayName":"Demo","role":"student"}');
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [grade, setGrade] = useState("8");
  const [notifHomework, setNotifHomework] = useState(true);
  const [notifTests, setNotifTests] = useState(true);
  const [notifGames, setNotifGames] = useState(false);
  const [notifResults, setNotifResults] = useState(true);
  const [autoDeleteExpired, setAutoDeleteExpired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("setting_value")
        .eq("setting_key", "auto_delete_expired_homework")
        .single();
      if (data) setAutoDeleteExpired(data.setting_value === "true");
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    localStorage.setItem("user", JSON.stringify({ ...user, displayName }));

    const { error } = await supabase
      .from("user_settings")
      .update({ setting_value: autoDeleteExpired ? "true" : "false" })
      .eq("setting_key", "auto_delete_expired_homework");

    if (error) {
      toast({ title: "Hiba a mentésnél", variant: "destructive" });
      return;
    }
    toast({ title: "Beállítások mentve!" });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-8"><Settings className="w-6 h-6 text-primary" /> Profil Beállítások</h1>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
              {(displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{user.username}</p>
              <p className="text-sm text-muted-foreground">{user.role === "teacher" ? "Tanár" : "Diák"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Megjelenített név</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            {user.role === "student" && (
              <div>
                <Label className="font-semibold">Évfolyam</Label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}. osztály</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Házi feladat beállítások</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Lejárt házi feladatok automatikus törlése</span>
              <p className="text-xs text-muted-foreground mt-0.5">Ha bekapcsolod, a lejárt határidejű házi feladatok automatikusan eltűnnek.</p>
            </div>
            <Switch checked={autoDeleteExpired} onCheckedChange={setAutoDeleteExpired} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Értesítési beállítások</h2>
          <div className="space-y-4">
            {[
              { label: "Házi feladat határidők", value: notifHomework, set: setNotifHomework },
              { label: "Dolgozatok és tesztek", value: notifTests, set: setNotifTests },
              { label: "Új játékok", value: notifGames, set: setNotifGames },
              { label: "Eredmények", value: notifResults, set: setNotifResults },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <span className="text-sm font-medium">{n.label}</span>
                <Switch checked={n.value} onCheckedChange={n.set} />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 font-bold text-lg py-5">
          <Save className="w-5 h-5" /> Beállítások Mentése
        </Button>
      </main>
    </div>
  );
};

export default Profile;
