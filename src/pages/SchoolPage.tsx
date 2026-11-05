import { useEffect, useState } from "react";
import { Megaphone, Plus, School, Trash2, UserPlus, Users, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";
import RichMarkdown from "@/components/RichMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type SchoolRow = { id: string; name: string; city: string | null; principal_id: string };
type Member = { id: string; user_id: string; member_role: string; name: string; username: string };
type Post = { id: string; author_id: string; title: string | null; message: string; pinned: boolean; created_at: string };

const roleLabel: Record<string, string> = { principal: "🏫 Igazgató", teacher: "👨‍🏫 Tanár", student: "🎓 Diák", parent: "👪 Szülő" };

const SchoolPage = () => {
  const { user } = useAuth();
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [addUser, setAddUser] = useState("");
  const [addCode, setAddCode] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pinned, setPinned] = useState(false);

  const loadSchools = async () => {
    if (!user) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("school_principals").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("schools").select("id, name, city, principal_id").order("name"),
    ]);
    setIsPrincipal(!!p);
    const list = (s || []) as SchoolRow[];
    setSchools(list);
    setSchoolId((cur) => (cur && list.some((x) => x.id === cur) ? cur : list[0]?.id || ""));
  };
  useEffect(() => { loadSchools(); }, [user?.id]);

  const loadSchool = async () => {
    if (!schoolId) { setMembers([]); setPosts([]); return; }
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from("school_members").select("id, user_id, member_role").eq("school_id", schoolId),
      supabase.from("school_announcements").select("id, author_id, title, message, pinned, created_at").eq("school_id", schoolId).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    const ids = (m || []).map((x) => x.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, display_name, username").in("id", ids) : { data: [] as any[] };
    setMembers((m || []).map((x) => {
      const p = (profs || []).find((pp: any) => pp.id === x.user_id) as any;
      return { ...x, name: p?.display_name || p?.username || "Felhasználó", username: p?.username || "" };
    }));
    setPosts((a || []) as Post[]);
  };
  useEffect(() => { loadSchool(); }, [schoolId]);

  const school = schools.find((s) => s.id === schoolId);
  const amPrincipal = !!school && school.principal_id === user?.id;
  const myRole = members.find((m) => m.user_id === user?.id)?.member_role;
  const canPost = myRole === "principal" || myRole === "teacher";
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.name || "Ismeretlen";

  const createSchool = async () => {
    if (!user || newName.trim().length < 2) return;
    const { data, error } = await supabase.from("schools").insert({ name: newName.trim(), city: newCity.trim() || null, principal_id: user.id }).select("id").single();
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    setNewName(""); setNewCity("");
    toast({ title: "Iskola létrehozva 🏫" });
    await loadSchools();
    setSchoolId(data.id);
  };

  const addMember = async () => {
    if (!addUser.trim()) return;
    const { data, error } = await supabase.rpc("add_school_member", { _school: schoolId, _username: addUser.trim(), _code: addCode.trim() || null });
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hozzáadva", description: roleLabel[data as string] });
    setAddUser(""); setAddCode("");
    loadSchool();
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`Eltávolítod: ${m.name}?`)) return;
    await supabase.from("school_members").delete().eq("id", m.id);
    loadSchool();
  };

  const post = async () => {
    if (!user || !message.trim()) return;
    const { error } = await supabase.from("school_announcements").insert({ school_id: schoolId, author_id: user.id, title: title.trim() || null, message: message.trim(), pinned });
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    setTitle(""); setMessage(""); setPinned(false);
    loadSchool();
  };

  const deletePost = async (id: string) => { await supabase.from("school_announcements").delete().eq("id", id); loadSchool(); };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-black flex items-center gap-2"><School className="w-8 h-8 text-primary" /> Iskola</h1>
          {schools.length > 1 && (
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 font-semibold">
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {isPrincipal && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Új iskola létrehozása</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Iskola neve" className="rounded-xl" />
              <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Település (nem kötelező)" className="rounded-xl" />
              <Button onClick={createSchool} className="rounded-xl shrink-0">Létrehozás</Button>
            </div>
          </div>
        )}

        {!school ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <School className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-bold">Még nem vagy egy iskolában sem</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isPrincipal ? "Hozd létre az első iskoládat fent." : "Az iskolád igazgatója tud felvenni. Diákként kérj iskolai kódot a Profil oldalon, és add meg neki a felhasználóneveddel együtt."}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="wall">
            <TabsList className="rounded-xl">
              <TabsTrigger value="wall" className="gap-2"><Megaphone className="w-4 h-4" /> Üzenőfal</TabsTrigger>
              <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" /> Tagok ({members.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="wall" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Ezeket csak a(z) <b>{school.name}</b> tagjai látják.</p>
              {canPost && (
                <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cím (nem kötelező)" className="rounded-xl" />
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Bejelentés szövege…" className="rounded-xl min-h-[100px]" />
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Kitűzés</label>
                    <Button onClick={post} disabled={!message.trim()} className="rounded-xl">Közzététel</Button>
                  </div>
                </div>
              )}
              {posts.length === 0 ? (
                <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" /> Még nincs bejelentés.
                </div>
              ) : posts.map((p) => (
                <article key={p.id} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      {p.title && <h3 className="font-bold text-lg flex items-center gap-2">{p.pinned && <Pin className="w-4 h-4 text-primary" />}{p.title}</h3>}
                      <p className="text-xs text-muted-foreground">{nameOf(p.author_id)} · {new Date(p.created_at).toLocaleString("hu-HU")}</p>
                    </div>
                    {(p.author_id === user?.id || amPrincipal) && (
                      <Button size="icon" variant="ghost" aria-label="Törlés" onClick={() => deletePost(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                  <RichMarkdown content={p.message} />
                </article>
              ))}
            </TabsContent>

            <TabsContent value="members" className="space-y-4 mt-4">
              {amPrincipal && (
                <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
                  <h2 className="font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Tag hozzáadása</h2>
                  <p className="text-xs text-muted-foreground">Tanárt és szülőt elég a felhasználónévvel. Diáknál kell a diák iskolai kódja is (a Profil oldalán kéri).</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input value={addUser} onChange={(e) => setAddUser(e.target.value)} placeholder="Felhasználónév" className="rounded-xl" />
                    <Input value={addCode} onChange={(e) => setAddCode(e.target.value.toUpperCase())} placeholder="Diák kódja (csak diáknál)" maxLength={8} className="rounded-xl font-mono" />
                    <Button onClick={addMember} className="rounded-xl shrink-0">Hozzáadás</Button>
                  </div>
                </div>
              )}
              {(["principal", "teacher", "student", "parent"] as const).map((r) => {
                const list = members.filter((m) => m.member_role === r);
                if (!list.length) return null;
                return (
                  <div key={r} className="space-y-2">
                    <p className="font-bold text-sm">{roleLabel[r]} ({list.length})</p>
                    {list.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2">
                        <span className="text-sm"><b>{m.name}</b> <span className="text-muted-foreground">@{m.username}</span></span>
                        {amPrincipal && m.user_id !== user?.id && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember(m)}>Eltávolítás</Button>
                        )}
                        {!amPrincipal && m.user_id === user?.id && (
                          <Badge variant="secondary">Te</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default SchoolPage;
