import { useState } from "react";
import { ArrowLeft, Megaphone, Send, ImagePlus, Star, Weight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardNav from "@/components/DashboardNav";

type Announcement = {
  id: number;
  sender: string;
  subject: string;
  message: string;
  grade?: string;
  weight?: string;
  imageUrl?: string;
  date: string;
};

const Announcements = () => {
  const [announcements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    subject: "",
    message: "",
    grade: "",
    weight: "",
  });
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

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
          {/* New announcement form */}
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
                  <Label>Tantárgy</Label>
                  <Input
                    value={newAnnouncement.subject}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, subject: e.target.value })}
                    placeholder="pl. Matematika"
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Üzenet</Label>
                  <Textarea
                    value={newAnnouncement.message}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                    placeholder="Írj egy közleményt..."
                    className="mt-1.5 rounded-xl min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Jegy (opcionális)</Label>
                    <Select
                      value={newAnnouncement.grade}
                      onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, grade: v })}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue placeholder="Válassz jegyet" />
                      </SelectTrigger>
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
                    <Select
                      value={newAnnouncement.weight}
                      onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, weight: v })}
                    >
                      <SelectTrigger className="mt-1.5 rounded-xl">
                        <SelectValue placeholder="Válassz súlyt" />
                      </SelectTrigger>
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
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setShowNewAnnouncement(false);
                      setNewAnnouncement({ subject: "", message: "", grade: "", weight: "" });
                    }}
                  >
                    Mégse
                  </Button>
                  <Button className="rounded-full bg-primary gap-2">
                    <Send className="w-4 h-4" /> Küldés
                  </Button>
                </div>
              </div>
            )}
          </div>

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
                    {a.sender.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.sender}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  {a.grade && (
                    <Badge className={`text-sm px-3 py-1 ${
                      Number(a.grade) >= 4 ? "bg-success/10 text-success" :
                      Number(a.grade) === 3 ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      Jegy: {a.grade}
                    </Badge>
                  )}
                </div>
                {a.subject && (
                  <Badge variant="outline" className="mb-2">{a.subject}</Badge>
                )}
                <p className="text-sm">{a.message}</p>
                {a.weight && (
                  <p className="text-xs text-muted-foreground mt-2">Súlyozás: {a.weight}%</p>
                )}
                {a.imageUrl && (
                  <img src={a.imageUrl} alt="Csatolmány" className="mt-3 rounded-xl max-h-48 object-cover" />
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Announcements;
