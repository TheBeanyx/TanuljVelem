import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Search, UserPlus, MessageSquare, X, Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
};

const Friends = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [classmates, setClassmates] = useState<{ id: string; name: string; className: string }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchClassmates();
  }, [user]);

  const fetchClassmates = async () => {
    if (!user) return;
    // Get user's classes
    const { data: memberships } = await supabase.from("class_members").select("class_id").eq("user_id", user.id);
    const { data: ownedClasses } = await supabase.from("classes").select("id, name").eq("owner_id", user.id);
    
    const classIds = [
      ...(memberships || []).map((m: any) => m.class_id),
      ...(ownedClasses || []).map((c: any) => c.id),
    ];
    if (classIds.length === 0) return;

    const uniqueClassIds = [...new Set(classIds)];
    const { data: allClasses } = await supabase.from("classes").select("id, name").in("id", uniqueClassIds);
    const classMap = new Map((allClasses || []).map((c: any) => [c.id, c.name]));

    const { data: allMembers } = await supabase.from("class_members").select("user_id, class_id").in("class_id", uniqueClassIds);
    const otherUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id).filter((id: string) => id !== user.id))];
    
    if (otherUserIds.length === 0) return;
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", otherUserIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const result: { id: string; name: string; className: string }[] = [];
    const seen = new Set<string>();
    for (const m of allMembers || []) {
      if (m.user_id === user.id || seen.has(m.user_id)) continue;
      seen.add(m.user_id);
      const p = profileMap.get(m.user_id);
      if (p) {
        result.push({
          id: p.id,
          name: p.display_name || p.username,
          className: classMap.get(m.class_id) || "",
        });
      }
    }
    setClassmates(result);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Show all users
      const { data } = await supabase.from("profiles").select("id, username, display_name, role").limit(50);
      setAllUsers((data || []).filter((p: any) => p.id !== user?.id) as UserProfile[]);
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, role")
      .or(`username.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`)
      .limit(20);
    setSearchResults((data || []).filter((p: any) => p.id !== user?.id) as UserProfile[]);
  };

  const displayedUsers = searchResults.length > 0 ? searchResults : allUsers;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="rounded-full gap-1"><ArrowLeft className="w-4 h-4" /> Vissza</Button></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-success" /> Barátok</h1>
        </div>

        {/* Search */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <h3 className="font-bold mb-3">Felhasználó keresése</h3>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Felhasználónév keresése..."
              className="rounded-full"
            />
            <Button onClick={handleSearch} className="rounded-full gap-2 bg-primary"><Search className="w-4 h-4" /> Keresés</Button>
          </div>
        </div>

        {/* Search results */}
        {displayedUsers.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h3 className="font-bold mb-3">Találatok ({displayedUsers.length})</h3>
            <div className="space-y-2">
              {displayedUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {(u.display_name || u.username).charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{u.display_name || u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username} · {u.role === "teacher" ? "Tanár" : "Diák"}</p>
                    </div>
                  </div>
                  <Link to="/messages">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="classmates">
          <TabsList className="rounded-full bg-muted p-1 mb-6">
            <TabsTrigger value="classmates" className="rounded-full">Osztálytársak ({classmates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="classmates">
            {classmates.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Nincs osztálytárs</p>
                <p className="text-sm mt-1">Csatlakozz egy osztályhoz, hogy itt lásd az osztálytársaidat!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classmates.map((c) => (
                  <div key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{c.name.charAt(0)}</div>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.className}</p>
                      </div>
                    </div>
                    <Link to="/messages">
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Friends;
