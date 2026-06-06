import { useState } from "react";
import { Lightbulb, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_USERNAME_FALLBACK = "thebeanyx11";

const Suggestions = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!user) {
      toast({ title: "Bejelentkezés szükséges", variant: "destructive" });
      return;
    }
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      // Find admin profile (case-insensitive username match)
      const { data: admins } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", ADMIN_USERNAME_FALLBACK);

      const admin = admins?.[0];
      if (!admin?.id) {
        toast({ title: "Nem található az admin felhasználó", variant: "destructive" });
        return;
      }

      const text = `**💡 Javaslat: ${title.trim()}**\n\n${body.trim()}\n\n_— ${profile?.display_name || profile?.username || "Névtelen"}_`;

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: admin.id,
        text,
      });
      if (error) throw error;
      setDone(true);
      setTitle("");
      setBody("");
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10 max-w-xl">
        <Link to="/profile">
          <Button variant="ghost" size="sm" className="rounded-full gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Vissza
          </Button>
        </Link>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h1 className="text-2xl font-black flex items-center gap-2 mb-2">
            <Lightbulb className="w-6 h-6 text-primary" /> Javaslatok
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Van ötleted? Hiányolsz egy funkciót? Írd meg nekünk! Az üzenetek közvetlenül az admin csapathoz érkeznek.
          </p>

          {done && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Köszönjük! A javaslatod elküldve.
            </div>
          )}

          <div className="space-y-3">
            <Input
              placeholder="Rövid cím (pl. Sötét téma a tesztoldalon)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Írd le részletesen az ötletet... (Markdown támogatott)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="rounded-xl"
            />
            <Button onClick={send} disabled={sending || !title.trim() || !body.trim()} className="w-full rounded-xl gap-2">
              <Send className="w-4 h-4" /> {sending ? "Küldés..." : "Javaslat küldése"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Suggestions;
