import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TeacherSiteFrame from "@/components/TeacherSiteFrame";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function PublishedTeacherSite() {
  const { slug } = useParams();
  const [page, setPage] = useState<{ title: string; html: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.from("published_teacher_websites").select("title, html").eq("slug", slug ?? "").maybeSingle().then(({ data, error }) => {
      if (!cancelled) { setPage(data); setError(Boolean(error)); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [slug]);
  return <div className="min-h-screen bg-background flex flex-col">
    <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
      <Link to="/" className="flex items-center gap-2 font-extrabold"><GraduationCap className="text-primary w-6 h-6" />TanuljVelem</Link>
      <span className="text-sm text-muted-foreground truncate">{page?.title}</span>
    </header>
    {loading ? <p className="p-12 text-center text-muted-foreground">Betöltés…</p> : page ? <TeacherSiteFrame title={page.title} html={page.html} className="flex-1 min-h-[calc(100dvh-65px)]" /> : <div className="p-12 text-center space-y-4"><h1 className="text-2xl font-bold">{error ? "A tananyag nem tölthető be" : "Ez a tananyag még nincs közzétéve"}</h1><Button asChild variant="outline"><Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />TanuljVelem</Link></Button></div>}
  </div>;
}