import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  suspended?: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {profile?.suspended ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="bg-card border-2 border-destructive rounded-2xl p-8 text-center max-w-md">
            <div className="text-5xl mb-3">🚫</div>
            <h1 className="text-2xl font-black text-destructive mb-2">Fiók felfüggesztve</h1>
            <p className="text-sm text-muted-foreground mb-4">
              A fiókodat az admin csapat felfüggesztette. Amíg nem oldják fel, nem férsz hozzá a felülethez.
              Írj az admin csapatnak email-ben, ha kérdésed van.
            </p>
            <button onClick={signOut} className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-semibold">
              Kijelentkezés
            </button>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

