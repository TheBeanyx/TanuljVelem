import { useEffect, useState } from "react";
import { Copy, KeyRound, School, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Code = { id: string; code: string; expires_at: string; used_at: string | null };

const SchoolCodeCard = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<Code[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("school_join_codes").select("id, code, expires_at, used_at").eq("student_id", user.id).order("created_at", { ascending: false });
    setCodes((data || []) as Code[]);
  };
  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("school_join_codes").insert({ student_id: user.id });
    setBusy(false);
    if (error) { toast({ title: "Nem sikerült kódot kérni", variant: "destructive" }); return; }
    load();
  };
  const remove = async (id: string) => { await supabase.from("school_join_codes").delete().eq("id", id); load(); };
  const active = codes.filter((c) => !c.used_at && new Date(c.expires_at) > new Date());

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div>
        <h2 className="font-bold text-lg flex items-center gap-2"><School className="w-5 h-5 text-primary" /> Iskolai kód</h2>
        <p className="text-sm text-muted-foreground mt-1">Az igazgató csak ezzel a kóddal és a felhasználóneveddel tud felvenni az iskolába. 7 napig érvényes, egyszer használható.</p>
      </div>
      <Button onClick={create} disabled={busy} className="rounded-xl gap-2"><KeyRound className="w-4 h-4" /> Kód kérése</Button>
      {active.map((c) => (
        <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border p-3 flex-wrap">
          <span className="font-mono font-black tracking-widest text-lg">{c.code}</span>
          <span className="text-xs text-muted-foreground flex-1">lejár: {new Date(c.expires_at).toLocaleDateString("hu-HU")}</span>
          <Button size="icon" variant="ghost" aria-label="Kód másolása" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Kód másolva" }); }}><Copy className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Kód törlése" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
};

export default SchoolCodeCard;
