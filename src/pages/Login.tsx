import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo login
    if (username && password) {
      localStorage.setItem("user", JSON.stringify({ username, displayName: username, role: "student" }));
      toast({ title: "Sikeres bejelentkezés!" });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
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
            <Label htmlFor="username" className="font-semibold">Felhasználónév</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Add meg a felhasználóneved"
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
          <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg py-5">
            Bejelentkezés
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Még nincs fiókod? <Link to="/register" className="text-primary font-semibold hover:underline">Regisztrálj itt</Link>
          </p>
        </form>
      </div>

      {/* Right - Decorative */}
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
