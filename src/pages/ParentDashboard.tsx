import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, FileText, KeyRound, MessageSquare, CheckCircle2, Circle, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";
import FamilyChats from "@/components/FamilyChats";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { fetchLinkedChildren, fetchStudentClassIds, type Person } from "@/lib/familyData";
import { isValidParentCodeFormat, normalizeParentCode } from "@/lib/parents";

type Hw = { id: string; subject: string; title: string; description: string | null; deadline: string | null; class_id: string | null; creator_id: string | null };
type Exam = { id: string; subject: string; title: string; topic: string | null; exam_type: string; exam_date: string | null };
type Result = { id: string; score: number; total_questions: number; percentage: number; completed_at: string; tests: { title: string; subject: string } | null };

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }) : "nincs határidő";

const ParentDashboard = () => {
  const { user, profile, loading } = useAuth();
  const [children, setChildren] = useState<Person[]>([]);
  const [childId, setChildId] = useState("");
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [homeworks, setHomeworks] = useState<Hw[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<{ total_points: number; current_streak: number } | null>(null);

  const loadChildren = async () => {
    if (!user) return;
    const kids = await fetchLinkedChildren(user.id);
    setChildren(kids);
    setChildId((cur) => (cur && kids.some((k) => k.id === cur) ? cur : kids[0]?.id || ""));
  };
  useEffect(() => { loadChildren(); }, [user?.id]);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      const classIds = await fetchStudentClassIds(childId);
      const orFilter = classIds.length ? `creator_id.eq.${childId},class_id.in.(${classIds.join(",")})` : `creator_id.eq.${childId}`;
      const [hw, ex, res, comp, cls, st] = await Promise.all([
        supabase.from("homeworks").select("id, subject, title, description, deadline, class_id, creator_id").or(orFilter).order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("exams").select("id, subject, title, topic, exam_type, exam_date").or(orFilter).order("exam_date", { ascending: true, nullsFirst: false }),
        supabase.from("test_results").select("id, score, total_questions, percentage, completed_at, tests(title, subject)").eq("user_id", childId).order("completed_at", { ascending: false }).limit(50),
        supabase.from("homework_completions").select("homework_id").eq("user_id", childId),
        classIds.length ? supabase.from("classes").select("id, name").in("id", classIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        supabase.from("user_stats").select("total_points, current_streak").eq("user_id", childId).maybeSingle(),
      ]);
      setHomeworks((hw.data || []) as Hw[]);
      setExams((ex.data || []) as Exam[]);
      setResults((res.data || []) as unknown as Result[]);
      setDoneIds(new Set((comp.data || []).map((c) => c.homework_id)));
      setClassNames(Object.fromEntries(((cls as any).data || []).map((c: any) => [c.id, c.name])));
      setStats(st.data as any);
    })();
  }, [childId]);

  const redeem = async () => {
    if (!isValidParentCodeFormat(code)) { toast({ title: "A kód 8 karakterből áll", variant: "destructive" }); return; }
    setRedeeming(true);
    const { error } = await supabase.rpc("redeem_parent_code", { _code: normalizeParentCode(code) });
    setRedeeming(false);
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sikeres összekapcsolás! 🎉" });
    setCode("");
    loadChildren();
  };

  const avg = useMemo(() => results.length ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length) : null, [results]);
  const openHw = homeworks.filter((h) => !doneIds.has(h.id));
  const child = children.find((c) => c.id === childId);

  if (!loading && profile && profile.role !== "parent") {
    return (
      <div className="min-h-screen bg-background"><DashboardNav />
        <p className="p-12 text-center text-muted-foreground">Ez az oldal szülői fiókkal érhető el. Diákként a Profil oldalon kérhetsz kódot a szülődnek.</p>
      </div>
    );
  }

  const codeBox = (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <h2 className="font-bold text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Gyermek hozzáadása</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-3">Kérd meg a gyermeked, hogy a Profil oldalán kérjen szülői kódot, és küldje el neked emailben.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="pl. AB12CD34" maxLength={12} className="rounded-xl font-mono tracking-widest uppercase" />
        <Button onClick={redeem} disabled={redeeming || !code.trim()} className="rounded-xl shrink-0">Kód beváltása</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><Users className="w-7 h-7 text-primary" /> Gyermekem</h1>
            <p className="text-muted-foreground text-sm">Kövesd a házikat, dolgozatokat és teszteredményeket.</p>
          </div>
          {children.length > 1 && (
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {children.length === 0 ? codeBox : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Nyitott házi", value: openHw.length, icon: BookOpen },
                { label: "Közelgő dolgozat", value: exams.filter((e) => !e.exam_date || e.exam_date >= new Date().toISOString().slice(0, 10)).length, icon: FileText },
                { label: "Teszt átlag", value: avg === null ? "–" : `${avg}%`, icon: ClipboardList },
                { label: "Pont · streak", value: stats ? `${stats.total_points} · 🔥${stats.current_streak}` : "–", icon: Trophy },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl border border-border p-4">
                  <s.icon className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xl font-black">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="homework">
              <TabsList className="w-full grid grid-cols-4 h-auto p-1 gap-1">
                <TabsTrigger value="homework" className="text-xs sm:text-sm px-1 py-2">Házik</TabsTrigger>
                <TabsTrigger value="exams" className="text-xs sm:text-sm px-1 py-2">Dolgozatok</TabsTrigger>
                <TabsTrigger value="results" className="text-xs sm:text-sm px-1 py-2">Tesztek</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs sm:text-sm px-1 py-2">Üzenetek</TabsTrigger>
              </TabsList>

              <TabsContent value="homework" className="space-y-2 mt-4">
                {homeworks.length === 0 ? <Empty icon={BookOpen} text={`${child?.name || "A gyermeked"} még nem rögzített házit.`} /> : homeworks.map((h) => {
                  const done = doneIds.has(h.id);
                  return (
                    <div key={h.id} className="bg-card rounded-2xl border border-border p-4 flex gap-3">
                      {done ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold ${done ? "line-through text-muted-foreground" : ""}`}>{h.title}</p>
                        {h.description && <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="secondary">{h.subject}</Badge>
                          <Badge variant="outline">{fmtDate(h.deadline)}</Badge>
                          {h.class_id && classNames[h.class_id] && <Badge variant="outline">👥 {classNames[h.class_id]}</Badge>}
                          {done && <Badge>Kész</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="exams" className="space-y-2 mt-4">
                {exams.length === 0 ? <Empty icon={FileText} text="Nincs rögzített dolgozat." /> : exams.map((e) => (
                  <div key={e.id} className="bg-card rounded-2xl border border-border p-4">
                    <p className="font-bold">{e.title}</p>
                    {e.topic && <p className="text-sm text-muted-foreground">{e.topic}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary">{e.subject}</Badge>
                      <Badge variant="outline">{e.exam_type}</Badge>
                      <Badge variant="outline">{fmtDate(e.exam_date)}</Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="results" className="space-y-2 mt-4">
                {results.length === 0 ? <Empty icon={ClipboardList} text="Még nincs kitöltött teszt." /> : results.map((r) => (
                  <div key={r.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{r.tests?.title || "Teszt"}</p>
                      <p className="text-xs text-muted-foreground">{r.tests?.subject} · {new Date(r.completed_at).toLocaleDateString("hu-HU")}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${Number(r.percentage) >= 50 ? "text-primary" : "text-destructive"}`}>{Math.round(Number(r.percentage))}%</p>
                      <p className="text-xs text-muted-foreground">{r.score}/{r.total_questions}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <FamilyChats onlyStudentId={childId} />
              </TabsContent>
            </Tabs>

            {codeBox}
          </>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Minden tanári beszélgetés: <Link to="/family-chats" className="text-primary font-semibold hover:underline inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Szülői üzenetek</Link>
        </p>
      </main>
    </div>
  );
};

const Empty = ({ icon: Icon, text }: { icon: typeof BookOpen; text: string }) => (
  <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
    <Icon className="w-10 h-10 mx-auto mb-3 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);

export default ParentDashboard;
