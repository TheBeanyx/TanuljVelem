import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Users, ScrollText, Plus, Trash2, Pencil, Save, Send, ArrowLeft, Activity, MessageSquare, Trophy, Award, Minus, Eye, FileText, Gamepad2, Megaphone, BookOpen, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";
import { BADGES, BadgeId } from "@/lib/gamification";

const ADMIN_EMAIL = "thebeanyx11@gmail.com";

type ProfileRow = { id: string; username: string; display_name: string | null; role: string };
type RuleRow = { id: string; title: string; body: string; sort_order: number };

const notify = async (adminId: string, userId: string, text: string, isWarning = false) => {
  await supabase.from("direct_messages").insert({
    sender_id: adminId,
    receiver_id: userId,
    text,
    is_warning: isWarning,
  });
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  // Lists
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [newRule, setNewRule] = useState({ title: "", body: "" });
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);

  // Profile edit / warning
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [warnUser, setWarnUser] = useState<ProfileRow | null>(null);
  const [warnText, setWarnText] = useState("");

  // User detail
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [userSubs, setUserSubs] = useState<any[]>([]);
  const [userSent, setUserSent] = useState<any[]>([]);
  const [userReceived, setUserReceived] = useState<any[]>([]);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [userAnnouncements, setUserAnnouncements] = useState<any[]>([]);
  const [userHomeworks, setUserHomeworks] = useState<any[]>([]);
  const [pointDelta, setPointDelta] = useState("");
  const [pointReason, setPointReason] = useState("");

  // Global content
  const [allTests, setAllTests] = useState<any[]>([]);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);
  const [allHomeworks, setAllHomeworks] = useState<any[]>([]);

  const fetchAll = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, role").order("username"),
      supabase.from("rules").select("*").order("sort_order"),
    ]);
    setProfiles((p || []) as ProfileRow[]);
    setRules((r || []) as RuleRow[]);
  };

  const fetchContent = async () => {
    const [t, g, a, h] = await Promise.all([
      supabase.from("tests").select("id, title, subject, grade, creator_name, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_games").select("id, title, subject, creator_id, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("announcements").select("id, subject, message, sender_id, visibility, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("homeworks").select("id, title, subject, deadline, creator_id, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setAllTests(t.data || []);
    setAllGames(g.data || []);
    setAllAnnouncements(a.data || []);
    setAllHomeworks(h.data || []);
  };

  const loadUserDetail = async (u: ProfileRow) => {
    setSelectedUser(u);
    const [stats, badges, events, subs, sent, received, games, anns, hws] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", u.id).maybeSingle(),
      supabase.from("user_badges").select("badge_id").eq("user_id", u.id),
      supabase.from("point_events").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("challenge_subscriptions").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("direct_messages").select("id, receiver_id, text, created_at, is_warning").eq("sender_id", u.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("direct_messages").select("id, sender_id, text, created_at, is_warning").eq("receiver_id", u.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("ai_games").select("id, title, created_at").eq("creator_id", u.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("id, subject, message, created_at").eq("sender_id", u.id).order("created_at", { ascending: false }),
      supabase.from("homeworks").select("id, title, subject, deadline, created_at").eq("creator_id", u.id).order("created_at", { ascending: false }),
    ]);
    setUserStats(stats.data);
    setUserBadges((badges.data || []).map((b: any) => b.badge_id));
    setUserEvents(events.data || []);
    setUserSubs(subs.data || []);
    setUserSent(sent.data || []);
    setUserReceived(received.data || []);
    setUserGames(games.data || []);
    setUserAnnouncements(anns.data || []);
    setUserHomeworks(hws.data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
      fetchContent();
    }
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
    await notify(user.id, editing.id, `ℹ️ **Fiók frissítve adminisztrátor által**\n\nA profilodat módosítottuk (név/szerepkör/felhasználónév). Ha kérdésed van, válaszolj erre az üzenetre.`);
    setEditing(null);
    fetchAll();
    if (selectedUser?.id === editing.id) loadUserDetail({ ...selectedUser, ...editing });
  };

  const sendWarning = async () => {
    if (!warnUser || !warnText.trim()) return;
    const formatted = `⚠️ **HIVATALOS FIGYELMEZTETÉS — TanuljVelem Admin**\n\n${warnText.trim()}\n\n_Kérjük tartsd be a [Szabályzatot](/rules). A figyelmeztetések felhalmozódhatnak és felfüggesztéshez vezethetnek._`;
    await notify(user.id, warnUser.id, formatted, true);
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

  // ------- Points / badges actions -------
  const adjustPoints = async () => {
    if (!selectedUser || !pointDelta) return;
    const delta = parseInt(pointDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    const current = userStats?.total_points ?? 0;
    const newTotal = Math.max(0, current + delta);
    await supabase.from("user_stats").upsert({
      user_id: selectedUser.id,
      total_points: newTotal,
      current_streak: userStats?.current_streak ?? 0,
      longest_streak: userStats?.longest_streak ?? 0,
      last_activity_date: userStats?.last_activity_date ?? new Date().toISOString().slice(0, 10),
    });
    await supabase.from("point_events").insert({
      user_id: selectedUser.id,
      action: delta > 0 ? "admin_grant" : "admin_revoke",
      points: delta,
      metadata: { reason: pointReason || null, by: "admin" } as never,
    });
    const sign = delta > 0 ? "+" : "";
    const emoji = delta > 0 ? "🎁" : "⚖️";
    await notify(
      user.id,
      selectedUser.id,
      `${emoji} **Pont módosítás admin által**\n\n**${sign}${delta} pont** ${delta > 0 ? "hozzáadva" : "levonva"}.\nÚj egyenleg: **${newTotal}**\n${pointReason ? `\n_Indok: ${pointReason}_` : ""}`,
    );
    setPointDelta("");
    setPointReason("");
    toast({ title: "Pontok frissítve" });
    loadUserDetail(selectedUser);
  };

  const grantBadge = async (badgeId: BadgeId) => {
    if (!selectedUser) return;
    if (userBadges.includes(badgeId)) return toast({ title: "Már megvan ez a küldetés" });
    const { error } = await supabase.from("user_badges").insert({ user_id: selectedUser.id, badge_id: badgeId });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    const b = BADGES[badgeId];
    await notify(user.id, selectedUser.id, `🏅 **Küldetés odaítélve!**\n\n${b.emoji} **${b.name}** — _${b.description}_\n\nGratulálunk!`);
    loadUserDetail(selectedUser);
  };

  const revokeBadge = async (badgeId: string) => {
    if (!selectedUser) return;
    if (!confirm(`Biztosan elveszed a "${BADGES[badgeId as BadgeId]?.name || badgeId}" küldetést?`)) return;
    await supabase.from("user_badges").delete().eq("user_id", selectedUser.id).eq("badge_id", badgeId);
    const b = BADGES[badgeId as BadgeId];
    await notify(user.id, selectedUser.id, `❌ **Küldetés visszavonva**\n\n${b?.emoji || ""} **${b?.name || badgeId}** küldetést admin visszavonta.`);
    loadUserDetail(selectedUser);
  };

  // ------- Content deletion -------
  const deleteContent = async (
    table: "tests" | "ai_games" | "announcements" | "homeworks",
    id: string,
    ownerId: string | null,
    label: string,
  ) => {
    if (!confirm(`Biztosan törlöd: "${label}"?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Törölve" });
    if (ownerId) {
      const typeMap: any = {
        tests: "dolgozatot",
        ai_games: "játékot",
        announcements: "posztot",
        homeworks: "házi feladatot",
      };
      await notify(user.id, ownerId, `🗑️ **Tartalom eltávolítva**\n\nAz egyik ${typeMap[table]} eltávolítottuk: _"${label}"_\nHa kérdésed van a döntéssel kapcsolatban, válaszolj erre.`);
    }
    fetchContent();
    if (selectedUser) loadUserDetail(selectedUser);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile"><Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Admin Panel</h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full mb-6 flex-wrap h-auto">
            <TabsTrigger value="users" className="flex-1 gap-2"><Users className="w-4 h-4" /> Felhasználók</TabsTrigger>
            <TabsTrigger value="content" className="flex-1 gap-2"><FileText className="w-4 h-4" /> Tartalom</TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 gap-2"><ScrollText className="w-4 h-4" /> Szabályok</TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid md:grid-cols-[1fr_2fr] gap-4">
              {/* Left: list */}
              <div className="space-y-3">
                <Input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl" />
                <div className="bg-card rounded-2xl border border-border divide-y divide-border max-h-[70vh] overflow-y-auto">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadUserDetail(p)}
                      className={`w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition ${selectedUser?.id === p.id ? "bg-primary/10" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                        {(p.display_name || p.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.display_name || p.username}</p>
                        <p className="text-xs text-muted-foreground truncate">@{p.username} · {p.role}</p>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nincs találat.</p>}
                </div>
              </div>

              {/* Right: detail */}
              <div>
                {!selectedUser ? (
                  <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
                    <Eye className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Válassz felhasználót a részletek megtekintéséhez.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 flex-wrap">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                        {(selectedUser.display_name || selectedUser.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-black text-lg truncate">{selectedUser.display_name || selectedUser.username}</h2>
                        <p className="text-xs text-muted-foreground">@{selectedUser.username} · {selectedUser.role}</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => setEditing({ ...selectedUser })}>
                        <Pencil className="w-3.5 h-3.5" /> Szerkeszt
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-xl gap-1" onClick={() => setWarnUser(selectedUser)}>
                        <AlertTriangle className="w-3.5 h-3.5" /> Figyelmeztetés
                      </Button>
                    </div>

                    {/* Stats + point adjust */}
                    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                      <h3 className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Pontok és sorozat</h3>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-muted/50 rounded-xl p-2"><p className="text-xs text-muted-foreground">Pontok</p><p className="font-black text-lg">{userStats?.total_points ?? 0}</p></div>
                        <div className="bg-muted/50 rounded-xl p-2"><p className="text-xs text-muted-foreground">Sorozat</p><p className="font-black text-lg">{userStats?.current_streak ?? 0}</p></div>
                        <div className="bg-muted/50 rounded-xl p-2"><p className="text-xs text-muted-foreground">Leghosszabb</p><p className="font-black text-lg">{userStats?.longest_streak ?? 0}</p></div>
                      </div>
                      <div className="flex gap-2 flex-wrap items-end">
                        <div className="flex-1 min-w-[80px]">
                          <Label className="text-xs">Pont +/-</Label>
                          <Input type="number" placeholder="pl. 50 vagy -20" value={pointDelta} onChange={(e) => setPointDelta(e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="flex-[2] min-w-[140px]">
                          <Label className="text-xs">Indok (opcionális)</Label>
                          <Input placeholder="Miért?" value={pointReason} onChange={(e) => setPointReason(e.target.value)} className="rounded-xl" />
                        </div>
                        <Button onClick={adjustPoints} className="rounded-xl gap-1">
                          {parseInt(pointDelta || "0") < 0 ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />} Alkalmaz
                        </Button>
                      </div>
                    </div>

                    {/* Badges/quests */}
                    <div className="bg-card rounded-2xl border border-border p-4">
                      <h3 className="font-bold flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-purple-500" /> Küldetések / Jelvények</h3>
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1">Megszerzett ({userBadges.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {userBadges.length === 0 && <span className="text-xs text-muted-foreground">Még egy sincs.</span>}
                          {userBadges.map((bid) => {
                            const b = BADGES[bid as BadgeId];
                            return (
                              <button key={bid} onClick={() => revokeBadge(bid)} title="Kattints az elvételhez" className="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs flex items-center gap-1 hover:bg-destructive/20 hover:border-destructive transition">
                                <span>{b?.emoji || "🏅"}</span><span className="font-semibold">{b?.name || bid}</span><Minus className="w-3 h-3" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" /> Új küldetés odaítélése</summary>
                        <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto">
                          {Object.values(BADGES).filter((b) => !userBadges.includes(b.id)).map((b) => (
                            <button key={b.id} onClick={() => grantBadge(b.id)} className="px-2 py-1 rounded-full bg-muted hover:bg-primary/20 border border-border text-xs flex items-center gap-1">
                              <span>{b.emoji}</span><span>{b.name}</span><Plus className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>

                    {/* Tabs for details */}
                    <Tabs defaultValue="activity">
                      <TabsList className="w-full flex-wrap h-auto">
                        <TabsTrigger value="activity" className="flex-1 gap-1 text-xs"><Activity className="w-3.5 h-3.5" /> Tevékenység</TabsTrigger>
                        <TabsTrigger value="subs" className="flex-1 gap-1 text-xs"><BookOpen className="w-3.5 h-3.5" /> Kihívások</TabsTrigger>
                        <TabsTrigger value="msgs" className="flex-1 gap-1 text-xs"><MessageSquare className="w-3.5 h-3.5" /> Üzenetek</TabsTrigger>
                        <TabsTrigger value="content" className="flex-1 gap-1 text-xs"><FileText className="w-3.5 h-3.5" /> Tartalom</TabsTrigger>
                      </TabsList>

                      <TabsContent value="activity" className="mt-3">
                        <div className="bg-card rounded-2xl border border-border divide-y divide-border max-h-[40vh] overflow-y-auto">
                          {userEvents.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Nincs tevékenység.</p>}
                          {userEvents.map((e) => (
                            <div key={e.id} className="p-2.5 text-xs flex items-center gap-2">
                              <span className={`font-bold ${e.points >= 0 ? "text-emerald-600" : "text-destructive"}`}>{e.points > 0 ? "+" : ""}{e.points}</span>
                              <span className="flex-1 truncate">{e.action}</span>
                              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU")}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="subs" className="mt-3">
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                          {userSubs.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">Nincs aktív kihívás.</p>}
                          {userSubs.map((s) => (
                            <div key={s.id} className="bg-card border border-border rounded-xl p-3 text-xs">
                              <p className="font-bold">{s.subject} · {s.grade}. évf. · <span className="text-muted-foreground font-normal">{s.status}</span></p>
                              <p className="text-muted-foreground">{s.start_date} → {s.end_date} · cél: napi {s.daily_goal_points}, össz {s.total_goal_points}</p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="msgs" className="mt-3 space-y-2">
                        <div>
                          <h4 className="text-xs font-bold mb-1">Küldött ({userSent.length})</h4>
                          <div className="bg-card border border-border rounded-xl divide-y divide-border max-h-[20vh] overflow-y-auto">
                            {userSent.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Nincs.</p>}
                            {userSent.map((m) => (
                              <div key={m.id} className={`p-2 text-xs ${m.is_warning ? "bg-destructive/5" : ""}`}>
                                <p className="line-clamp-2">{m.text}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("hu-HU")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold mb-1">Fogadott ({userReceived.length})</h4>
                          <div className="bg-card border border-border rounded-xl divide-y divide-border max-h-[20vh] overflow-y-auto">
                            {userReceived.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Nincs.</p>}
                            {userReceived.map((m) => (
                              <div key={m.id} className={`p-2 text-xs ${m.is_warning ? "bg-destructive/5" : ""}`}>
                                <p className="line-clamp-2">{m.text}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("hu-HU")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="content" className="mt-3 space-y-3">
                        <ContentList title="Játékok" icon={<Gamepad2 className="w-3.5 h-3.5" />} items={userGames.map((g) => ({ id: g.id, label: g.title, sub: new Date(g.created_at).toLocaleDateString() }))} onDelete={(id, label) => deleteContent("ai_games", id, selectedUser.id, label)} />
                        <ContentList title="Közlemények" icon={<Megaphone className="w-3.5 h-3.5" />} items={userAnnouncements.map((a) => ({ id: a.id, label: a.subject || a.message.slice(0, 50), sub: new Date(a.created_at).toLocaleDateString() }))} onDelete={(id, label) => deleteContent("announcements", id, selectedUser.id, label)} />
                        <ContentList title="Házi feladatok" icon={<BookOpen className="w-3.5 h-3.5" />} items={userHomeworks.map((h) => ({ id: h.id, label: h.title, sub: `${h.subject} · ${h.deadline || "—"}` }))} onDelete={(id, label) => deleteContent("homeworks", id, selectedUser.id, label)} />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* GLOBAL CONTENT TAB */}
          <TabsContent value="content" className="space-y-4">
            <ContentSection title="Dolgozatok" icon={<FileText className="w-4 h-4" />} items={allTests.map((t) => ({ id: t.id, label: t.title, sub: `${t.subject} · ${t.grade}. · ${t.creator_name}`, ownerId: null }))} onDelete={(id, ownerId, label) => deleteContent("tests", id, ownerId, label)} />
            <ContentSection title="Játékok" icon={<Gamepad2 className="w-4 h-4" />} items={allGames.map((g) => ({ id: g.id, label: g.title, sub: g.subject, ownerId: g.creator_id }))} onDelete={(id, ownerId, label) => deleteContent("ai_games", id, ownerId, label)} />
            <ContentSection title="Posztok / Közlemények" icon={<Megaphone className="w-4 h-4" />} items={allAnnouncements.map((a) => ({ id: a.id, label: a.subject || a.message.slice(0, 60), sub: a.visibility, ownerId: a.sender_id }))} onDelete={(id, ownerId, label) => deleteContent("announcements", id, ownerId, label)} />
            <ContentSection title="Házi feladatok" icon={<BookOpen className="w-4 h-4" />} items={allHomeworks.map((h) => ({ id: h.id, label: h.title, sub: `${h.subject} · ${h.deadline || "—"}`, ownerId: h.creator_id }))} onDelete={(id, ownerId, label) => deleteContent("homeworks", id, ownerId, label)} />
          </TabsContent>

          {/* RULES TAB */}
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

// ----- Helpers -----
function ContentList({ title, icon, items, onDelete }: { title: string; icon: React.ReactNode; items: { id: string; label: string; sub?: string }[]; onDelete: (id: string, label: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-3 py-2 border-b border-border font-bold text-xs flex items-center gap-2">{icon} {title} ({items.length})</div>
      <div className="divide-y divide-border max-h-40 overflow-y-auto">
        {items.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Nincs.</p>}
        {items.map((it) => (
          <div key={it.id} className="p-2 flex items-center gap-2 text-xs">
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">{it.label}</p>
              {it.sub && <p className="text-muted-foreground truncate text-[10px]">{it.sub}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(it.id, it.label)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentSection({ title, icon, items, onDelete }: { title: string; icon: React.ReactNode; items: { id: string; label: string; sub?: string; ownerId: string | null }[]; onDelete: (id: string, ownerId: string | null, label: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="px-4 py-3 border-b border-border font-bold flex items-center gap-2">{icon} {title} <span className="text-xs text-muted-foreground font-normal">({items.length})</span></div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {items.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nincs.</p>}
        {items.map((it) => (
          <div key={it.id} className="p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">{it.label}</p>
              {it.sub && <p className="text-muted-foreground truncate text-xs">{it.sub}</p>}
            </div>
            <Button size="sm" variant="ghost" className="rounded-xl gap-1" onClick={() => onDelete(it.id, it.ownerId, it.label)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" /> Töröl
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
