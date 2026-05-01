import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Email elküldve! 📧", description: "Nézd meg a postaládád." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 w-fit">
          <ArrowLeft className="w-4 h-4" /> Vissza a bejelentkezéshez
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold">TanuljVelem</span>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black">Ellenőrizd az emailedet!</h1>
            <p className="text-muted-foreground">
              Küldtünk egy linket a <span className="font-semibold text-foreground">{email}</span> címre.
              Kattints rá, hogy új jelszót adj meg.
            </p>
            <Link to="/login">
              <Button variant="outline" className="rounded-xl mt-4">Vissza a bejelentkezéshez</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black mb-2">Elfelejtett jelszó</h1>
            <p className="text-muted-foreground mb-8">
              Add meg az email címed, és küldünk egy linket a jelszó visszaállításához.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="font-semibold">Email cím</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@email.com"
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg py-5">
                {loading ? "Küldés..." : "Visszaállító link küldése"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
