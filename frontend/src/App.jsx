import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import DailyLogin from "@/components/DailyLogin";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Matches from "@/pages/Matches";
import MatchDetail from "@/pages/MatchDetail";
import Predictions from "@/pages/Predictions";
import Leaderboard from "@/pages/Leaderboard";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import PackOpening from "@/pages/PackOpening";
import Collection from "@/pages/Collection";
import Trading from "@/pages/Trading";
import DailyChallenge from "@/pages/DailyChallenge";
import Missions from "@/pages/Missions";
import ForgotPassword from "@/pages/ForgotPassword";
import { seedAPI } from "@/lib/api";
import api from "@/lib/api";

function AppInner() {
  const { theme } = useTheme();

  useEffect(() => {
    seedAPI.seed().catch(() => {});
    api.post('/seed-players').catch(() => {});
  }, []);

  return (
    <div className="App min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <BrowserRouter>
        <Navbar />
        <DailyLogin />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:id" element={<MatchDetail />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/packs" element={<PackOpening />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/challenge" element={<DailyChallenge />} />
            <Route path="/missions" element={<Missions />} />
          </Routes>
        </main>
      </BrowserRouter>
      <Toaster theme={theme} position="top-right" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppInner />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
