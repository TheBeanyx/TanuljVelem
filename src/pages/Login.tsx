import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        toast({
          title: "Email nincs megerősítve 📧",
          description: "Kattints a regisztrációkor küldött emailben lévő linkre, hogy aktiváld a fiókod.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Hiba", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Sikeres bejelentkezés!" });
      navigate("/dashboard");
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({ title: "Add meg az email címed", description: "Először írd be az email címedet.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Megerősítő email újraküldve! 📧", description: "Nézd meg a postaládád." });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 w-fit">
          <ArrowLeft className="w-4 h-4" /> Vissza a főoldalra
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold">TanuljVelem</span>
        </div>
        <h1 className="text-3xl font-black mb-2">Üdvözöllek!</h1>
        <p className="text-muted-foreground mb-8">Jelentkezz be a fiókodba</p>

        <form onSubmit={handleLogin} className="space-y-5 max-w-sm">
          <div>
            <Label htmlFor="email" className="font-semibold">Email cím</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add meg az email címed"
              className="mt-1.5 rounded-xl"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="font-semibold">Jelszó</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Add meg a jelszavad"
                className="rounded-xl pr-10"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg py-5">
            {loading ? "Bejelentkezés..." : "Bejelentkezés"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Még nincs fiókod? <Link to="/register" className="text-primary font-semibold hover:underline">Regisztrálj itt</Link>
          </p>
        </form>
      </div>

      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="text-center">
          <GraduationCap className="w-24 h-24 text-primary-foreground/30 mx-auto mb-6 animate-float" />
          <h2 className="text-4xl font-black text-primary-foreground">Készen Állsz Tanulni?</h2>
          <p className="text-primary-foreground/70 mt-4 text-lg">Lépj be és fedezd fel a tudás világát!</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
