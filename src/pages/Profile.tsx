import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Settings, Save, MessageCircleQuestion, Send, Bot, Loader2, Sun, Moon, Monitor, Upload, Check, Lightbulb, ScrollText, Shield, Download, Bell, Smartphone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRESET_AVATARS, resolveAvatarUrl } from "@/lib/avatars";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUPPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [grade, setGrade] = useState("8");
  const [notifHomework, setNotifHomework] = useState(true);
  const [notifTests, setNotifTests] = useState(true);
  const [notifGames, setNotifGames] = useState(false);
  const [notifResults, setNotifResults] = useState(true);
  const [autoDeleteExpired, setAutoDeleteExpired] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Support chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // PWA install & notifications
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsInstalled(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        toast({ title: "Sikeres telepítés! 🎉" });
        setInstallPrompt(null);
      }
    } else {
      toast({
        title: "Telepítés nem elérhető",
        description: "Használd a böngésző menüjét: 'Alkalmazás telepítése' vagy 'Hozzáadás a főképernyőhöz'.",
      });
    }
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "A böngésző nem támogatja az értesítéseket", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      new Notification("TanuljVelem", { body: "Értesítések bekapcsolva! 🔔", icon: "/icon-192.png" });
      toast({ title: "Értesítések engedélyezve! ✅" });
    } else {
      toast({ title: "Értesítések letiltva", description: "A böngésző beállításaiban módosíthatod.", variant: "destructive" });
    }
  };


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // sync local state from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || profile.username || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

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

  const selectPresetAvatar = async (presetId: string) => {
    if (!user) return;
    setAvatarUrl(presetId);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: presetId })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Nem sikerült beállítani az avatart", variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Profilkép frissítve! ✨" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Túl nagy a kép (max 2MB)", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(newUrl);
      await refreshProfile();
      toast({ title: "Profilkép feltöltve! 🎉" });
    } catch (err: any) {
      toast({ title: "Feltöltési hiba", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    if (profErr) {
      toast({ title: "Hiba a név mentésénél", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("user_settings")
      .update({ setting_value: autoDeleteExpired ? "true" : "false" })
      .eq("setting_key", "auto_delete_expired_homework");

    if (error) {
      toast({ title: "Hiba a mentésnél", variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Beállítások mentve!" });
  };

  const sendSupport = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(SUPPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Hiba történt");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      upsertAssistant(`\n\n⚠️ ${e.message || "Hiba történt"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-xl">
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 mb-6 sm:mb-8">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" /> Profil Beállítások
        </h1>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full mb-3 grid grid-cols-3 h-auto p-1 gap-1">
            <TabsTrigger value="settings" className="gap-1.5 px-2 py-2 text-xs sm:text-sm min-w-0">
              <Settings className="w-4 h-4 shrink-0" />
              <span className="truncate">Beállítások</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 px-2 py-2 text-xs sm:text-sm min-w-0">
              <MessageCircleQuestion className="w-4 h-4 shrink-0" />
              <span className="truncate">Kapcsolat</span>
            </TabsTrigger>
            <TabsTrigger value="download" className="gap-1.5 px-2 py-2 text-xs sm:text-sm min-w-0">
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">Letöltés</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2 mb-6">
            <Link to="/suggestions">
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <Lightbulb className="w-4 h-4" /> Javaslatok
              </Button>
            </Link>
            <Link to="/rules">
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <ScrollText className="w-4 h-4" /> Szabályzat
              </Button>
            </Link>
            {user?.email?.toLowerCase() === "thebeanyx11@gmail.com" && (
              <Link to="/admin">
                <Button size="sm" className="rounded-full gap-2 bg-destructive hover:bg-destructive/90">
                  <Shield className="w-4 h-4" /> Admin Panel
                </Button>
              </Link>
            )}
          </div>


          <TabsContent value="settings" className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                  <AvatarImage src={resolveAvatarUrl(avatarUrl) ?? undefined} alt={profile?.username || "profil"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                    {(displayName || profile?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{profile?.username || "..."}</p>
                  <p className="text-sm text-muted-foreground">{profile?.role === "teacher" ? "Tanár" : "Diák"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="font-semibold">Megjelenített név</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 rounded-xl" />
                </div>
                {profile?.role === "student" && (
                  <div>
                    <Label className="font-semibold">Évfolyam</Label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}. osztály</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Avatar választó */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-1">Profilkép</h2>
              <p className="text-sm text-muted-foreground mb-4">Válassz egyet az alapokból, vagy tölts fel sajátot.</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {PRESET_AVATARS.map((a) => {
                  const selected = avatarUrl === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => selectPresetAvatar(a.id)}
                      className={`relative aspect-square rounded-2xl border-2 p-1 transition-all hover:scale-105 ${
                        selected ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:border-primary/30"
                      }`}
                      aria-label={`${a.label} avatar`}
                    >
                      <img src={a.src} alt={a.label} className="w-full h-full object-contain" loading="lazy" />
                      {selected && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full rounded-xl gap-2"
              >
                {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingAvatar ? "Feltöltés..." : "Saját kép feltöltése (max 2MB)"}
              </Button>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Házi feladat beállítások</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Lejárt házi feladatok automatikus törlése</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Ha bekapcsolod, a lejárt határidejű házi feladatok automatikusan eltűnnek.</p>
                </div>
                <Switch checked={autoDeleteExpired} onCheckedChange={setAutoDeleteExpired} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Megjelenés</h2>
              <div className="flex gap-3">
                {([
                  { value: "light" as const, icon: Sun, label: "Világos" },
                  { value: "dark" as const, icon: Moon, label: "Sötét" },
                  { value: "system" as const, icon: Monitor, label: "Automatikus" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
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

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-start gap-3 mb-3">
                  <Bell className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Push / böngésző értesítések</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Weben a böngésző, telepített appként pedig a mobil push értesítéseket használjuk.
                    </p>
                  </div>
                </div>
                {notifPermission === "granted" ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                    <Check className="w-4 h-4" /> Értesítések engedélyezve
                  </div>
                ) : notifPermission === "denied" ? (
                  <p className="text-xs text-destructive">
                    Az értesítések le vannak tiltva. Engedélyezd a böngésző beállításaiban.
                  </p>
                ) : (
                  <Button onClick={requestNotifications} variant="outline" className="w-full rounded-xl gap-2">
                    <Bell className="w-4 h-4" /> Értesítések engedélyezése
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 font-bold text-lg py-5">
              <Save className="w-5 h-5" /> Beállítások Mentése
            </Button>
          </TabsContent>

          <TabsContent value="contact">
            <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col h-[70vh] max-h-[600px] min-h-[400px]">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
                <MessageCircleQuestion className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <span className="font-bold text-sm">TanuljVelem Segítő</span>
                  <p className="text-xs text-muted-foreground">Kérdezz az oldal működéséről!</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Szia! 👋 Miben segíthetek?</p>
                    <p className="text-xs mt-1">Kérdezz bármit az oldal működéséről!</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {["Hogyan hozok létre osztályt?", "Hogyan küldök üzenetet?", "Hogyan működnek a tesztek?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); }}
                          className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Írj egy kérdést az oldal működéséről..."
                  rows={1}
                  className="resize-none rounded-xl text-sm min-h-[38px] max-h-[100px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendSupport();
                    }
                  }}
                />
                <Button onClick={sendSupport} disabled={loading || !input.trim()} size="icon" className="rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="download" className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Alkalmazás letöltése</h2>
                  <p className="text-sm text-muted-foreground">Telepítsd a TanuljVelem-et a telefonodra vagy gépedre.</p>
                </div>
              </div>

              {isInstalled ? (
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold text-sm">Az alkalmazás már telepítve van! 🎉</span>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleInstall}
                    className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 font-bold py-5"
                  >
                    <Download className="w-5 h-5" />
                    {isIOS ? "Telepítési útmutató (iPhone)" : "App telepítése"}
                  </Button>

                  {showIOSHint && isIOS && (
                    <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3 text-sm">
                      <p className="font-semibold flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-primary" /> iPhone / iPad telepítés
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                        <li>Nyisd meg az oldalt a <strong>Safari</strong> böngészőben.</li>
                        <li>Koppints a <strong>Megosztás</strong> gombra (📤 alul).</li>
                        <li>Görgess és válaszd a <strong>„Hozzáadás a főképernyőhöz"</strong> opciót.</li>
                        <li>Nyomd meg a <strong>Hozzáadás</strong> gombot a jobb felső sarokban.</li>
                      </ol>
                    </div>
                  )}

                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <span className="font-bold text-foreground">🤖 Android:</span>
                      <span>Kattints a gombra és megjelenik a Chrome telepítési ablaka.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="font-bold text-foreground">🍎 iOS:</span>
                      <span>Nyisd meg Safariban, majd Megosztás → Hozzáadás a főképernyőhöz.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="font-bold text-foreground">💻 Asztali:</span>
                      <span>Chrome/Edge címsorában található telepítés ikon.</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Push értesítések
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Telepítés után a mobilod push értesítéseket kaphat, weben pedig a böngésző jelez.
              </p>
              {notifPermission === "granted" ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                  <Check className="w-4 h-4" /> Már engedélyezve
                </div>
              ) : (
                <Button onClick={requestNotifications} variant="outline" className="w-full rounded-xl gap-2">
                  <Bell className="w-4 h-4" /> Értesítések bekapcsolása
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
