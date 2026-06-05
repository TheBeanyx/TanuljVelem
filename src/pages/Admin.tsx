import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Users, ScrollText, Plus, Trash2, Pencil, Save, Send, ArrowLeft } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";

const ADMIN_EMAIL = "thebeanyx11@gmail.com";

type ProfileRow = { id: string; username: string; display_name: string | null; role: string };
type RuleRow = { id: string; title: string; body: string; sort_order: number };

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [warnUser, setWarnUser] = useState<ProfileRow | null>(null);
  const [warnText, setWarnText] = useState("");

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [newRule, setNewRule] = useState({ title: "", body: "" });
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);

  const fetchAll = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, role").order("username"),
      supabase.from("rules").select("*").order("sort_order"),
    ]);
    setProfiles((p || []) as ProfileRow[]);
    setRules((r || []) as RuleRow[]);
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  if (authLoading) return <div className="p-8">Betöltés...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-black text-xl mb-1">Nincs hozzáférés</h1>
          <p className="text-sm text-muted-foreground">Ez a felület csak az adminisztrátor számára érhető el.</p>
          <Link to="/dashboard"><Button className="mt-4 rounded-xl">Vissza</Button></Link>
        </div>
      </div>
    );

  const filtered = profiles.filter(
    (p) =>
      !search.trim() ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.display_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  const saveProfile = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: editing.display_name, role: editing.role, username: editing.username })
      .eq("id", editing.id);
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Mentve" });
    setEditing(null);
    fetchAll();
  };

  const sendWarning = async () => {
    if (!warnUser || !warnText.trim() || !user) return;
    const formatted = `⚠️ **HIVATALOS FIGYELMEZTETÉS — TanuljVelem Admin**\n\n${warnText.trim()}\n\n_Kérjük tartsd be a [Szabályzatot](/rules). A figyelmeztetések felhalmozódhatnak és felfüggesztéshez vezethetnek._`;
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: warnUser.id,
      text: formatted,
      is_warning: true,
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Figyelmeztetés elküldve" });
    setWarnUser(null);
    setWarnText("");
  };

  const addRule = async () => {
    if (!newRule.title.trim() || !newRule.body.trim()) return;
    const nextOrder = (rules[rules.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("rules").insert({ title: newRule.title.trim(), body: newRule.body.trim(), sort_order: nextOrder, created_by: user.id });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    setNewRule({ title: "", body: "" });
    fetchAll();
  };

  const updateRule = async () => {
    if (!editingRule) return;
    const { error } = await supabase.from("rules").update({ title: editingRule.title, body: editingRule.body }).eq("id", editingRule.id);
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    setEditingRule(null);
    fetchAll();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a szabályt?")) return;
    await supabase.from("rules").delete().eq("id", id);
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile"><Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Admin Panel</h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="users" className="flex-1 gap-2"><Users className="w-4 h-4" /> Felhasználók</TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 gap-2"><ScrollText className="w-4 h-4" /> Szabályok</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            <Input placeholder="Keresés név/username szerint..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl" />
            <div className="bg-card rounded-2xl border border-border divide-y divide-border max-h-[60vh] overflow-y-auto">
              {filtered.map((p) => (
                <div key={p.id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {(p.display_name || p.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground">@{p.username} · {p.role}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setEditing({ ...p })}>
                    <Pencil className="w-3.5 h-3.5" /> Szerkeszt
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-xl gap-1" onClick={() => setWarnUser(p)}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Figyelmeztetés
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nincs találat.</p>}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Új szabály</h2>
              <Input placeholder="Cím" value={newRule.title} onChange={(e) => setNewRule({ ...newRule, title: e.target.value })} className="rounded-xl" />
              <Textarea placeholder="Leírás (Markdown támogatott)" value={newRule.body} onChange={(e) => setNewRule({ ...newRule, body: e.target.value })} rows={3} className="rounded-xl" />
              <Button onClick={addRule} className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Hozzáadás</Button>
            </div>

            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border border-border p-4">
                  {editingRule?.id === r.id ? (
                    <div className="space-y-2">
                      <Input value={editingRule.title} onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })} className="rounded-xl" />
                      <Textarea value={editingRule.body} onChange={(e) => setEditingRule({ ...editingRule, body: e.target.value })} rows={3} className="rounded-xl" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={updateRule} className="rounded-xl gap-1"><Save className="w-3.5 h-3.5" /> Mentés</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingRule(null)} className="rounded-xl">Mégse</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold">{r.title}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.body}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setEditingRule(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit profile dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Felhasználó szerkesztése</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Felhasználónév</Label><Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></div>
                <div><Label>Megjelenített név</Label><Input value={editing.display_name || ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
                <div>
                  <Label>Szerepkör</Label>
                  <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full mt-1 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    <option value="student">Diák</option>
                    <option value="teacher">Tanár</option>
                  </select>
                </div>
              </div>
            )}
            <DialogFooter><Button onClick={saveProfile} className="rounded-xl gap-2"><Save className="w-4 h-4" /> Mentés</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Warning dialog */}
        <Dialog open={!!warnUser} onOpenChange={(o) => !o && setWarnUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Figyelmeztetés küldése</DialogTitle>
            </DialogHeader>
            {warnUser && <p className="text-sm text-muted-foreground">Címzett: <strong>{warnUser.display_name || warnUser.username}</strong></p>}
            <Textarea placeholder="Mit szegett meg? Mit várunk el? (Markdown támogatott)" value={warnText} onChange={(e) => setWarnText(e.target.value)} rows={5} className="rounded-xl" />
            <DialogFooter>
              <Button variant="destructive" onClick={sendWarning} className="rounded-xl gap-2"><Send className="w-4 h-4" /> Figyelmeztetés küldése</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;
