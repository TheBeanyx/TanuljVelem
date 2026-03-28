import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Hiba", description: "A jelszavak nem egyeznek!", variant: "destructive" });
      return;
    }
    localStorage.setItem("user", JSON.stringify({ username, displayName: displayName || username, role }));
    toast({ title: "Sikeres regisztráció!" });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-8">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 w-fit">
          <ArrowLeft className="w-4 h-4" /> Vissza a főoldalra
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold">TanuljVelem</span>
        </div>
        <h1 className="text-3xl font-black mb-6">Fiók Létrehozása</h1>

        <form onSubmit={handleRegister} className="space-y-5 max-w-sm">
          <div>
            <Label className="font-semibold mb-3 block">Ki vagy?</Label>
            <div className="flex gap-3">
              {(["student", "teacher"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {r === "student" ? "🎓 Diák" : "👨‍🏫 Tanár"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="displayName" className="font-semibold">Megjelenített név</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="pl. Kiss Peti" className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="username" className="font-semibold">Felhasználónév *</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Válassz felhasználónevet" className="mt-1.5 rounded-xl" required />
          </div>
          <div>
            <Label htmlFor="password" className="font-semibold">Jelszó *</Label>
            <div className="relative mt-1.5">
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Legalább 6 karakter" className="rounded-xl pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="font-semibold">Jelszó megerősítése *</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Írd be újra a jelszavad" className="mt-1.5 rounded-xl" required />
          </div>

          <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-lg py-5">
            Fiók Létrehozása
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Van már fiókod? <Link to="/login" className="text-primary font-semibold hover:underline">Bejelentkezés</Link>
          </p>
        </form>
      </div>

      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="text-center">
          <GraduationCap className="w-24 h-24 text-primary-foreground/30 mx-auto mb-6 animate-float" />
          <h2 className="text-4xl font-black text-primary-foreground">Csatlakozz Hozzánk!</h2>
          <p className="text-primary-foreground/70 mt-4 text-lg">Kezdj el tanulni már ma!</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
