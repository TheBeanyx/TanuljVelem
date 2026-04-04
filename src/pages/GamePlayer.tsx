import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";

const GamePlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<{ title: string; html_code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data } = await supabase.from("ai_games").select("title, html_code").eq("id", id).single();
      setGame(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg">Játék nem található.</p>
          <Button onClick={() => navigate("/games")} className="mt-4 rounded-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Vissza
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/games")} className="gap-2 rounded-full">
          <ArrowLeft className="w-4 h-4" /> Vissza
        </Button>
        <h1 className="font-bold text-lg truncate mx-4">{game.title}</h1>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-full">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Game iframe */}
      <div className="flex-1">
        <iframe
          srcDoc={game.html_code}
          title={game.title}
          className="w-full h-[calc(100vh-52px)] border-0"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};

export default GamePlayer;
