import { useEffect, useState } from "react";
import { Copy, Mail, KeyRound, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { buildParentInviteMailto, isCodeActive, PARENT_CODE_DAYS } from "@/lib/parents";

type Code = { id: string; code: string; parent_email: string | null; expires_at: string; used_at: string | null };
type Parent = { id: string; parent_id: string; name: string };

const ParentLinkCard = () => {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from("parent_link_codes").select("id, code, parent_email, expires_at, used_at").eq("student_id", user.id).order("created_at", { ascending: false }),
      supabase.from("parent_links").select("id, parent_id").eq("student_id", user.id),
    ]);
    setCodes((c || []) as Code[]);
    const ids = (l || []).map((x) => x.parent_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, display_name, username").in("id", ids) : { data: [] };
    setParents((l || []).map((x) => {
      const p = (profs || []).find((pp: any) => pp.id === x.parent_id) as any;
      return { id: x.id, parent_id: x.parent_id, name: p?.display_name || p?.username || "Szülő" };
    }));
  };
  useEffect(() => { load(); }, [user?.id]);

  const studentName = profile?.display_name || profile?.username || "A gyermeked";

  const createCode = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.from("parent_link_codes")
      .insert({ student_id: user.id, parent_email: email.trim() || null }).select("id, code, parent_email, expires_at, used_at").single();
    setBusy(false);
    if (error || !data) { toast({ title: "Nem sikerült kódot kérni", variant: "destructive" }); return; }
    await load();
    window.location.href = buildParentInviteMailto({ code: data.code, studentName, email: data.parent_email || undefined, origin: window.location.origin });
  };

  const sendAgain = (c: Code) => {
    window.location.href = buildParentInviteMailto({ code: c.code, studentName, email: c.parent_email || undefined, origin: window.location.origin });
  };

  const removeCode = async (id: string) => { await supabase.from("parent_link_codes").delete().eq("id", id); load(); };
  const unlink = async (id: string) => {
    if (!confirm("Biztosan leválasztod ezt a szülőt? Utána nem látja a dolgaidat.")) return;
    await supabase.from("parent_links").delete().eq("id", id);
    toast({ title: "Szülő leválasztva" });
    load();
  };

  const active = codes.filter((c) => isCodeActive(c));

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div>
        <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Szülői hozzáférés</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kérj egy kódot, és küldd el emailben a szülődnek. Ha megadja a szülői fiókjában, láthatja a házijaidat, dolgozataidat és teszteredményeidet. A kód {PARENT_CODE_DAYS} napig érvényes és egyszer használható.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Szülő email címe (nem kötelező)</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="szulo@pelda.hu" className="rounded-xl" />
          <Button onClick={createCode} disabled={busy} className="rounded-xl gap-2 shrink-0"><KeyRound className="w-4 h-4" /> Kód kérése és küldése</Button>
        </div>
        <p className="text-xs text-muted-foreground">A gomb megnyitja a levelezőprogramodat egy kész üzenettel.</p>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Aktív kódok</p>
          {active.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border p-3 flex-wrap">
              <span className="font-mono font-black tracking-widest text-lg">{c.code}</span>
              <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{c.parent_email || "nincs email"} · lejár: {new Date(c.expires_at).toLocaleDateString("hu-HU")}</span>
              <Button size="icon" variant="ghost" aria-label="Kód másolása" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Kód másolva" }); }}><Copy className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Küldés emailben" onClick={() => sendAgain(c)}><Mail className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Kód törlése" onClick={() => removeCode(c.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">Kapcsolt szülők</p>
        {parents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Még nincs kapcsolt szülő.</p>
        ) : parents.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <span className="font-semibold text-sm">👪 {p.name}</span>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => unlink(p.id)}>Leválasztás</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentLinkCard;
