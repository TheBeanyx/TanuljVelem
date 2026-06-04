import DashboardNav from "@/components/DashboardNav";
import PomodoroWidget from "@/components/PomodoroWidget";
import { Card, CardContent } from "@/components/ui/card";
import { Timer } from "lucide-react";

const Pomodoro = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold flex items-center justify-center gap-2">
            <Timer className="w-7 h-7 text-primary" /> Pomodoro időzítő
          </h1>
          <p className="text-muted-foreground mt-1">
            25 perc fókusz, majd 5 perc szünet. Maradj koncentrált!
          </p>
        </div>
        <PomodoroWidget embedded />
        <Card className="mt-6">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
            <p><strong>Hogyan használd?</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Válassz feladatot, amin dolgozni szeretnél.</li>
              <li>Indíts egy 25 perces fókusz blokkot.</li>
              <li>Amikor lejár, tarts 5 perc szünetet.</li>
              <li>4 kör után tarts hosszabb (15 perc) szünetet.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pomodoro;
