import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Code2, LayoutTemplate, Plus, Save, Globe, Trash2, ArrowUp, ArrowDown, Type, Image, MousePointer2, Minus, Upload, ExternalLink, Copy, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/DashboardNav";
import TeacherSiteFrame from "@/components/TeacherSiteFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteBlock, blocksToHtml, isValidSiteSlug, sitePath } from "@/lib/teacherSites";
import type { Tables, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

const blockTypes = [{ type: "heading", label: "Címsor", icon: Type }, { type: "text", label: "Szöveg", icon: Type }, { type: "image", label: "Kép", icon: Image }, { type: "button", label: "Gomb", icon: MousePointer2 }, { type: "divider", label: "Elválasztó", icon: Minus }] as const;
export default function TeacherEditor() {
  const { user, profile, loading } = useAuth();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [sites, setSites] = useState<Tables<"teacher_websites">[]>([]);
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState("");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const source = mode === "html" ? html : blocksToHtml(title, blocks);
  const loadSites = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("teacher_websites").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false });
    if (error) toast.error("A weboldalak nem tölthetők be."); else setSites(data ?? []);
    const { data: published } = await supabase.from("published_teacher_websites").select("id").eq("owner_id", user.id);
    setPublishedIds((published ?? []).map(s => s.id));
  };
  useEffect(() => {
    if (!user) return;
    supabase.rpc("can_author_teacher_site").then(({ data, error }) => {
      setEligible(!error && data === true);
      if (data === true) void loadSites();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const canSwitch = () => !dirty || window.confirm("A nem mentett módosítások elvesznek. Folytatod?");
  const openSite = (site?: Tables<"teacher_websites">) => {
    if (!canSwitch()) return;
    setId(site?.id ?? null); setTitle(site?.title ?? ""); setSlug(site?.slug ?? "");
    setMode(site?.editor_mode === "html" ? "html" : "visual"); setHtml(site?.html ?? "");
    setBlocks(Array.isArray(site?.blocks) ? site.blocks as unknown as SiteBlock[] : []); setEditing(true); setDirty(false);
  };
  const updateBlock = (blockId: string, patch: Partial<SiteBlock>) => { setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...patch } : b)); setDirty(true); };
  const moveBlock = (index: number, direction: number) => {
    const next = [...blocks]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; setBlocks(next); setDirty(true);
  };
  const save = async (publish = false) => {
    if (!user || busy) return;
    if (!title.trim() || !isValidSiteSlug(slug)) { toast.error("Adj címet és érvényes címet: kisbetűk, számok és kötőjelek, legfeljebb 80 karakter."); return; }
    if (publish && (mode === "html" ? !html.trim() : !blocks.length)) { toast.error("Előbb adj tartalmat az oldalhoz."); return; }
    setBusy(true);
    const nextId = id ?? crypto.randomUUID();
    const { error } = await supabase.from("teacher_websites").upsert({ id: nextId, owner_id: user.id, title: title.trim(), slug, editor_mode: mode, html, blocks: blocks as unknown as Json, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.code === "23505" ? "Ez a cím már foglalt. Válassz másikat." : "A mentés nem sikerült."); setBusy(false); return; }
    setId(nextId); setDirty(false);
    if (publish) {
      const { error: publishError } = await supabase.from("published_teacher_websites").upsert({ id: nextId, owner_id: user.id, title: title.trim(), slug, html: source, published_at: new Date().toISOString() });
      if (publishError) toast.error("A piszkozat mentve, de a közzététel nem sikerült."); else toast.success("A tananyag közzétéve!");
    } else toast.success("Piszkozat mentve.");
    await loadSites(); setBusy(false);
  };
  const unpublish = async () => {
    if (!id) return;
    setBusy(true);
    const { error } = await supabase.from("published_teacher_websites").delete().eq("id", id);
    if (error) toast.error("A visszavonás nem sikerült."); else { toast.success("A tananyag mostantól nem nyilvános."); await loadSites(); }
    setBusy(false);
  };
  const remove = async (site: Tables<"teacher_websites">) => {
    if (!window.confirm(`Törlöd ezt az oldalt: ${site.title}? A nyilvános oldal is megszűnik.`)) return;
    const { error } = await supabase.from("teacher_websites").delete().eq("id", site.id);
    if (error) toast.error("A törlés nem sikerült."); else { if (id === site.id) { setEditing(false); setDirty(false); setId(null); } await loadSites(); }
  };
  const uploadImage = async (file: File | undefined, blockId: string) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) { toast.error("PNG, JPG, WebP vagy GIF kép, legfeljebb 2 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === "string") updateBlock(blockId, { url: reader.result }); }; reader.readAsDataURL(file);
  };
  if (loading || (user && eligible === null)) return <div className="p-12 text-center">Betöltés…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== "teacher" || !eligible) return <div className="min-h-screen bg-background"><DashboardNav /><p className="p-12 text-center text-muted-foreground">A Weboldal szerkesztő tanári fiókkal érhető el.</p></div>;
  return <div className="min-h-screen bg-background"><DashboardNav />
    <main className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><div><p className="text-sm font-semibold text-primary">Tanár</p><h1 className="text-2xl font-extrabold">Weboldal szerkesztő</h1></div><Button onClick={() => openSite()}><Plus className="w-4 h-4 mr-2" />Új weboldal</Button></div>
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <aside className="border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pr-4 space-y-2">
          <h2 className="font-bold text-sm mb-3">Saját weboldalak</h2>
          {!sites.length && <div className="text-sm text-muted-foreground py-5"><Globe className="w-8 h-8 mb-3 text-primary/50" />Még nincs mentett weboldalad.</div>}
          {sites.map(site => <div key={site.id} className="flex items-center gap-1"><Button variant={id === site.id ? "secondary" : "ghost"} className="flex-1 min-w-0 justify-start h-auto py-2" onClick={() => openSite(site)}><span className="truncate text-left">{site.title}<span className="block text-xs opacity-70">{publishedIds.includes(site.id) ? "Közzétéve" : "Piszkozat"}</span></span></Button><Button variant="ghost" size="icon" onClick={() => remove(site)} aria-label={`${site.title} törlése`}><Trash2 className="w-4 h-4" /></Button></div>)}
        </aside>
        {!editing ? <div className="flex flex-col items-center justify-center py-20 text-center"><LayoutTemplate className="w-16 h-16 text-primary/40 mb-4" /><h2 className="text-xl font-bold mb-4">Saját tananyagod, saját weboldalad</h2><Button variant="outline" onClick={() => openSite()}><Plus className="w-4 h-4 mr-2" />Új weboldal</Button></div> : <div className="min-w-0">
          <div className="grid sm:grid-cols-2 gap-4 mb-4"><div><Label htmlFor="site-title">Oldal címe</Label><Input id="site-title" value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} className="mt-1" /></div><div><Label htmlFor="site-slug">Webcím vége</Label><Input id="site-slug" value={slug} maxLength={80} onChange={e => { setSlug(e.target.value.toLowerCase()); setDirty(true); }} placeholder="biologia-7" className="mt-1" /><p className="text-xs text-muted-foreground mt-1 break-all">{window.location.origin}/learn/{slug || "…"}</p></div></div>
          <div className="flex flex-wrap items-center gap-2 mb-4"><Tabs value={mode} onValueChange={value => { setMode(value as "visual" | "html"); setDirty(true); }}><TabsList><TabsTrigger value="visual"><LayoutTemplate className="w-4 h-4 mr-2" />Vizuális</TabsTrigger><TabsTrigger value="html"><Code2 className="w-4 h-4 mr-2" />HTML</TabsTrigger></TabsList></Tabs><div className="flex-1" /><span className="text-xs text-muted-foreground">{dirty ? "Nem mentett változások" : id ? "Mentve" : "Új piszkozat"}</span><Button variant="outline" disabled={busy} onClick={() => save()}><Save className="w-4 h-4 mr-2" />Mentés</Button><Button disabled={busy} onClick={() => save(true)}><Globe className="w-4 h-4 mr-2" />Közzététel</Button></div>
          {id && publishedIds.includes(id) && <div className="flex flex-wrap gap-2 mb-4"><Button asChild variant="outline" size="sm"><a href={sitePath(sites.find(s => s.id === id)?.slug ?? slug)} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Nyilvános oldal</a></Button><Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${sitePath(sites.find(s => s.id === id)?.slug ?? slug)}`); toast.success("Webcím másolva."); } catch { toast.error("A másolás nem sikerült."); } }}><Copy className="w-4 h-4 mr-2" />Cím másolása</Button><Button variant="ghost" size="sm" disabled={busy} onClick={unpublish}><EyeOff className="w-4 h-4 mr-2" />Közzététel visszavonása</Button></div>}
          <div className="grid xl:grid-cols-2 gap-5">
            <div className="min-w-0">
              {mode === "html" ? <><Button variant="outline" size="sm" className="mb-3" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" />HTML fájl feltöltése</Button><input ref={fileRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { toast.error("A HTML fájl legfeljebb 2 MB lehet."); return; } setHtml(await file.text()); setDirty(true); e.target.value = ""; }} /><Textarea aria-label="HTML kód" value={html} onChange={e => { setHtml(e.target.value); setDirty(true); }} className="font-mono text-sm min-h-[520px]" spellCheck={false} /></> : <>
                <div className="flex flex-wrap gap-2 mb-4">{blockTypes.map(item => <Button key={item.type} size="sm" variant="outline" onClick={() => { setBlocks(prev => [...prev, { id: crypto.randomUUID(), type: item.type, content: "", url: "", align: "left", animation: "none" }]); setDirty(true); }}><item.icon className="w-4 h-4 mr-1" />{item.label}</Button>)}</div>
                {!blocks.length && <div className="border border-dashed border-border rounded-lg p-10 text-center text-muted-foreground"><LayoutTemplate className="mx-auto w-10 h-10 mb-3" />Még nincs tartalom.</div>}
                <div className="space-y-3">{blocks.map((block, index) => <div key={block.id} className="border border-border rounded-lg p-3 bg-card space-y-3">
                  <div className="flex items-center gap-1"><span className="text-sm font-bold flex-1">{blockTypes.find(t => t.type === block.type)?.label}</span><Button size="icon" variant="ghost" className="w-8 h-8" disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label="Elem feljebb"><ArrowUp className="w-4 h-4" /></Button><Button size="icon" variant="ghost" className="w-8 h-8" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label="Elem lejjebb"><ArrowDown className="w-4 h-4" /></Button><Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setBlocks(prev => prev.filter(b => b.id !== block.id)); setDirty(true); }} aria-label="Elem törlése"><Trash2 className="w-4 h-4" /></Button></div>
                  {block.type !== "divider" && <Textarea aria-label={block.type === "image" ? "Kép leírása" : "Elem szövege"} value={block.content} onChange={e => updateBlock(block.id, { content: e.target.value })} rows={block.type === "text" ? 4 : 2} />}
                  {(block.type === "image" || block.type === "button") && <Input aria-label={block.type === "image" ? "Kép címe" : "Gomb hivatkozása"} placeholder="https://…" value={block.url.startsWith("data:") ? "" : block.url} onChange={e => updateBlock(block.id, { url: e.target.value })} />}
                  {block.type === "image" && <Label className="block text-xs text-muted-foreground">{block.url.startsWith("data:") ? "Kép feltöltve · csere" : "Kép feltöltése (max. 2 MB)"}<Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="mt-1" onChange={e => uploadImage(e.target.files?.[0], block.id)} /></Label>}
                  <div className="grid grid-cols-2 gap-2"><Select value={block.align} onValueChange={value => updateBlock(block.id, { align: value as SiteBlock["align"] })}><SelectTrigger aria-label="Igazítás"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Balra</SelectItem><SelectItem value="center">Középre</SelectItem><SelectItem value="right">Jobbra</SelectItem></SelectContent></Select><Select value={block.animation} onValueChange={value => updateBlock(block.id, { animation: value as SiteBlock["animation"] })}><SelectTrigger aria-label="Animáció"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nincs animáció</SelectItem><SelectItem value="fade">Áttűnés</SelectItem><SelectItem value="slide">Beúszás</SelectItem><SelectItem value="pulse">Pulzálás</SelectItem></SelectContent></Select></div>
                </div>)}</div>
              </>}
            </div>
            <section className="min-w-0"><h2 className="text-sm font-bold mb-3">Előnézet</h2><div className="border border-border rounded-lg overflow-hidden sticky top-24"><TeacherSiteFrame title={title} html={source} className="h-[600px]" /></div></section>
          </div>
        </div>}
      </div>
    </main>
  </div>;
}