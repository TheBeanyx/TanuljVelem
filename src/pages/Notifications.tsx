import { Bell, BookOpen, Trophy, Gamepad2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardNav from "@/components/DashboardNav";

const icons: Record<string, typeof Bell> = { deadline: BookOpen, result: Trophy, game: Gamepad2, test: FileText };

const demoNotifications = [
  { id: 1, type: "deadline", title: "Házi feladat határidő", desc: "Matematika házi holnap esedékes!", date: "Ma 09:00", read: false },
  { id: 2, type: "result", title: "Új eredmény", desc: "Angol teszt: 85%", date: "Tegnap 15:30", read: false },
  { id: 3, type: "game", title: "Új játék elérhető", desc: "FizikaLab most már játszható!", date: "Jún. 10", read: true },
  { id: 4, type: "test", title: "Új teszt", desc: "Történelem dolgozat kiírva", date: "Jún. 9", read: true },
];

const Notifications = () => (
  <div className="min-h-screen bg-background">
    <DashboardNav />
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-black flex items-center gap-2 mb-6"><Bell className="w-6 h-6 text-primary" /> Értesítések</h1>
      <div className="space-y-3">
        {demoNotifications.map((n) => {
          const Icon = icons[n.type] || Bell;
          return (
            <div key={n.id} className={`bg-card rounded-2xl border p-4 flex items-start gap-4 transition-colors ${n.read ? "border-border" : "border-primary/30 bg-primary/5"}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">{n.title}</p>
                  {!n.read && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">Új</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{n.desc}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  </div>
);

export default Notifications;
