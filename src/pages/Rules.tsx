import { useEffect, useState } from "react";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Rule = { id: string; title: string; body: string; sort_order: number };

const Rules = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rules")
        .select("id, title, body, sort_order")
        .order("sort_order", { ascending: true });
      setRules((data || []) as Rule[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <Link to="/profile">
          <Button variant="ghost" size="sm" className="rounded-full gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Vissza
          </Button>
        </Link>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h1 className="text-2xl font-black flex items-center gap-2 mb-2">
            <ScrollText className="w-6 h-6 text-primary" /> Szabályzat
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Az alábbi szabályok mindenkire vonatkoznak. Megszegésük figyelmeztetést vagy felfüggesztést von maga után.
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Betöltés...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Még nincsenek szabályok rögzítve.</p>
          ) : (
            <ol className="space-y-4">
              {rules.map((r, i) => (
                <li key={r.id} className="border border-border rounded-xl p-4">
                  <h2 className="font-bold mb-1">
                    {i + 1}. {r.title}
                  </h2>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{r.body}</ReactMarkdown>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
};

export default Rules;
