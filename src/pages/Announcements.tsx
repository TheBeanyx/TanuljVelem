import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Megaphone, Send, ImagePlus, Star, Weight, Lock, Globe, Search, MessageCircle, Bold, Italic, Underline, List } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Comment = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_profile?: { display_name: string | null; username: string };
};

type Announcement = {
  id: string;
  sender_id: string;
  visibility: string;
  recipient_id: string | null;
  class_name: string | null;
  subject: string | null;
  message: string;
  grade: string | null;
  weight: string | null;
  image_url: string | null;
  created_at: string;
  sender_profile?: { display_name: string | null; username: string };
  recipient_profile?: { display_name: string | null; username: string } | null;
  comments: Comment[];
};

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
};

// Render formatted text: **bold**, *italic*, __underline__, • bullets, newlines
const renderFormattedText = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const isBullet = line.startsWith("• ");
    const content = isBullet ? line.slice(2) : line;
    
    // Parse inline formatting
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let key = 0;
    
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={key++}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={key++}>{match[3]}</em>);
      } else if (match[4]) {
        parts.push(<u key={key++}>{match[4]}</u>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    if (parts.length === 0) parts.push("");

    return (
      <span key={i} className={isBullet ? "flex items-start gap-1.5" : ""}>
        {isBullet && <span className="text-primary mt-0.5">•</span>}
        <span>{parts}</span>
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
};

const Announcements = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [grade, setGrade] = useState("");
  const [weight, setWeight] = useState("");
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = useCallback((prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = message.slice(start, end);
    const newText = message.slice(0, start) + prefix + selected + suffix + message.slice(end);
    setMessage(newText);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = end + prefix.length;
    }, 0);
  }, [message]);

  const insertBullet = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = message.slice(0, pos);
    const after = message.slice(pos);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const bullet = (needsNewline ? "\n" : "") + "• ";
    setMessage(before + bullet + after);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = pos + bullet.length;
    }, 0);
  }, [message]);

  useEffect(() => {
    fetchAnnouncements();
    fetchStudents();
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const senderIds = [...new Set(data.map((a) => a.sender_id))];
      const recipientIds = [...new Set(data.filter((a) => a.recipient_id).map((a) => a.recipient_id!))];
      const allIds = [...new Set([...senderIds, ...recipientIds])];

      const announcementIds = data.map((a) => a.id);

      const [profilesRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name").in("id", allIds),
        announcementIds.length > 0
          ? supabase.from("announcement_comments").select("*").in("announcement_id", announcementIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map((p) => [p.id, p]) || []);

      // Fetch comment user profiles
      const commentUserIds = [...new Set((commentsRes.data || []).map((c: any) => c.user_id))];
      let commentProfileMap = new Map<string, any>();
      if (commentUserIds.length > 0) {
        const { data: cProfiles } = await supabase.from("profiles").select("id, username, display_name").in("id", commentUserIds);
        commentProfileMap = new Map(cProfiles?.map((p) => [p.id, p]) || []);
      }

      setAnnouncements(
        data.map((a) => ({
          ...a,
          sender_profile: profileMap.get(a.sender_id) as any,
          recipient_profile: a.recipient_id ? profileMap.get(a.recipient_id) as any : null,
          comments: (commentsRes.data || [])
            .filter((c: any) => c.announcement_id === a.id)
            .map((c: any) => ({ ...c, user_profile: commentProfileMap.get(c.user_id) })),
        }))
      );
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("role", "student");
    if (data) setStudents(data);
  };

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    if (visibility === "private" && !selectedRecipient) {
      toast({ title: "Hiba", description: "Válaszd ki a diákot!", variant: "destructive" });
      return;
    }
    if (visibility === "public" && !className.trim()) {
      toast({ title: "Hiba", description: "Add meg az osztály nevét!", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("announcements").insert({
      sender_id: user.id,
      visibility,
      recipient_id: visibility === "private" ? selectedRecipient : null,
      class_name: visibility === "public" ? className : null,
      subject: subject || null,
      message,
      grade: grade || null,
      weight: weight || null,
    });
    setSending(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Közlemény elküldve!" });
      resetForm();
      fetchAnnouncements();
    }
  };

  const handleComment = async (announcementId: string) => {
    const text = commentTexts[announcementId]?.trim();
    if (!user || !text) return;
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: announcementId,
      user_id: user.id,
      message: text,
    });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      setCommentTexts((prev) => ({ ...prev, [announcementId]: "" }));
      fetchAnnouncements();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("announcement_comments").delete().eq("id", commentId);
    fetchAnnouncements();
  };

  const resetForm = () => {
    setShowNewAnnouncement(false);
    setVisibility("public");
    setSelectedRecipient("");
    setClassName("");
    setSubject("");
    setMessage("");
    setGrade("");
    setWeight("");
    setStudentSearch("");
  };

  const filteredStudents = students.filter(
    (s) =>
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.display_name || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedStudentName = students.find((s) => s.id === selectedRecipient);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full gap-1">
              <ArrowLeft className="w-4 h-4" /> Vissza
            </Button>
          </Link>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Közlemények
          </h1>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* New announcement form - only for teachers */}
          {profile?.role === "teacher" && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <button
              onClick={() => setShowNewAnnouncement(!showNewAnnouncement)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Új közlemény írása...
              </p>
            </button>

            {showNewAnnouncement && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <div>
                  <Label className="font-semibold mb-3 block">Típus</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setVisibility("public")}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${visibility === "public" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      <Globe className="w-4 h-4" /> Publikus (osztály)
                    </button>
                    <button type="button" onClick={() => setVisibility("private")}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${visibility === "private" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      <Lock className="w-4 h-4" /> Privát (diák)
                    </button>
                  </div>
                </div>

                {visibility === "private" ? (
                  <div>
                    <Label className="font-semibold">Diák kiválasztása</Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Keresés név vagy felhasználónév alapján..." className="rounded-xl pl-9" />
                    </div>
                    {studentSearch && filteredStudents.length > 0 && !selectedRecipient && (
                      <div className="mt-2 border border-border rounded-xl max-h-40 overflow-y-auto">
                        {filteredStudents.map((s) => (
                          <button key={s.id} onClick={() => { setSelectedRecipient(s.id); setStudentSearch(""); }}
                            className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {(s.display_name || s.username).charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{s.display_name || s.username}</p>
                              <p className="text-xs text-muted-foreground">@{s.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedRecipient && selectedStudentName && (
                      <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(selectedStudentName.display_name || selectedStudentName.username).charAt(0)}
                        </div>
                        <span className="text-sm font-semibold">{selectedStudentName.display_name || selectedStudentName.username}</span>
                        <button onClick={() => setSelectedRecipient("")} className="ml-auto text-xs text-muted-foreground hover:text-destructive">✕</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="font-semibold">Osztály neve</Label>
                    <Input value={className} onChange={(e) => setClassName(e.target.value)}
                      placeholder="pl. 9.A" className="mt-1.5 rounded-xl" />
                  </div>
                )}

                <div>
                  <Label>Tantárgy</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="pl. Matematika" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Üzenet</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Írj egy közleményt..." className="mt-1.5 rounded-xl min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Jegy (opcionális)</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Válassz jegyet" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 - Jeles</SelectItem>
                        <SelectItem value="4">4 - Jó</SelectItem>
                        <SelectItem value="3">3 - Közepes</SelectItem>
                        <SelectItem value="2">2 - Elégséges</SelectItem>
                        <SelectItem value="1">1 - Elégtelen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Súlyozás (opcionális)</Label>
                    <Select value={weight} onValueChange={setWeight}>
                      <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Válassz súlyt" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100% - Dolgozat</SelectItem>
                        <SelectItem value="50">50% - Röpdolgozat</SelectItem>
                        <SelectItem value="25">25% - Felelet</SelectItem>
                        <SelectItem value="10">10% - Házi feladat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-full gap-2">
                    <ImagePlus className="w-4 h-4" /> Kép csatolása
                  </Button>
                  <div className="flex-1" />
                  <Button variant="ghost" className="rounded-full" onClick={resetForm}>Mégse</Button>
                  <Button className="rounded-full bg-primary gap-2" onClick={handleSend} disabled={sending}>
                    <Send className="w-4 h-4" /> {sending ? "Küldés..." : "Küldés"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Announcements list */}
          {announcements.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Még nincsenek közlemények</p>
              <p className="text-sm mt-1">A tanárok itt oszthatnak meg jegyeket, értékeléseket és fontos információkat.</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(a.sender_profile?.display_name || a.sender_profile?.username || "?").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.sender_profile?.display_name || a.sender_profile?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("hu-HU")}
                      {a.visibility === "private" && a.recipient_profile && (
                        <span className="ml-2">→ {a.recipient_profile.display_name || a.recipient_profile.username}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.visibility === "private" ? (
                      <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" /> Privát</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" /> {a.class_name}</Badge>
                    )}
                    {a.grade && (
                      <Badge className={`text-sm px-3 py-1 ${
                        Number(a.grade) >= 4 ? "bg-green-500/10 text-green-600" :
                        Number(a.grade) === 3 ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        Jegy: {a.grade}
                      </Badge>
                    )}
                  </div>
                </div>
                {a.subject && <Badge variant="outline" className="mb-2">{a.subject}</Badge>}
                <p className="text-sm">{a.message}</p>
                {a.weight && <p className="text-xs text-muted-foreground mt-2">Súlyozás: {a.weight}%</p>}
                {a.image_url && <img src={a.image_url} alt="Csatolmány" className="mt-3 rounded-xl max-h-48 object-cover" />}

                {/* Comments section */}
                <div className="mt-3 border-t border-border pt-3">
                  <button
                    onClick={() => setOpenComments((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {a.comments.length > 0 ? `${a.comments.length} hozzászólás` : "Hozzászólás"}
                  </button>

                  {openComments[a.id] && (
                    <div className="mt-3 space-y-2">
                      {a.comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 bg-muted/50 rounded-xl px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {(c.user_profile?.display_name || c.user_profile?.username || "?").charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{c.user_profile?.display_name || c.user_profile?.username}</p>
                            <p className="text-sm">{c.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleDateString("hu-HU")}</p>
                          </div>
                          {c.user_id === user?.id && (
                            <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-muted-foreground hover:text-destructive shrink-0">✕</button>
                          )}
                        </div>
                      ))}

                      {/* Comment input */}
                      <div className="flex gap-2">
                        <Input
                          value={commentTexts[a.id] || ""}
                          onChange={(e) => setCommentTexts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          placeholder="Írj hozzászólást..."
                          className="rounded-xl text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleComment(a.id)}
                        />
                        <Button size="sm" className="rounded-xl" onClick={() => handleComment(a.id)}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Announcements;
