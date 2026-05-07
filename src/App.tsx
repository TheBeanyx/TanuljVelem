import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Games from "./pages/Games";
import GamePlayer from "./pages/GamePlayer";
import Tests from "./pages/Tests";
import Learn from "./pages/Learn";
import PdfAnalyzer from "./pages/PdfAnalyzer";
import AiTutor from "./pages/AiTutor";
import Achievements from "./pages/Achievements";
import Classes from "./pages/Classes";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Announcements from "./pages/Announcements";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AiAssistant from "./components/AiAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:id" element={<GamePlayer />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/pdf-analyzer" element={<PdfAnalyzer />} />
            <Route path="/ai-tutor" element={<AiTutor />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AiAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
