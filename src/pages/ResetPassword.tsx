import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase auto-handles the recovery token from the URL hash and creates a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValidSession(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Hiba", description: "A jelszavak nem egyeznek!", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Hiba", description: "Legalább 6 karakter kell.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "Jelszó frissítve! ✅" });
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold">TanuljVelem</span>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black">Jelszó frissítve!</h1>
            <p className="text-muted-foreground">Átirányítunk a kezdőlapra...</p>
          </div>
        ) : !validSession ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-black">Érvénytelen vagy lejárt link</h1>
            <p className="text-muted-foreground">
              A jelszó-visszaállító link érvénytelen vagy már lejárt. Kérj egy újat.
            </p>
            <Link to="/forgot-password">
              <Button className="rounded-xl mt-4">Új link kérése</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black mb-2">Új jelszó megadása</h1>
            <p className="text-muted-foreground mb-8">Adj meg egy új, biztonságos jelszót.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="password" className="font-semibold">Új jelszó</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Legalább 6 karakter"
                    className="rounded-xl pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="font-semibold">Jelszó megerősítése</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Írd be újra"
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg py-5">
                {loading ? "Mentés..." : "Jelszó frissítése"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
