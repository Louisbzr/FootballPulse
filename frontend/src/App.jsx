import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Matches from "@/pages/Matches";
import MatchDetail from "@/pages/MatchDetail";
import Predictions from "@/pages/Predictions";
import Leaderboard from "@/pages/Leaderboard";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import { seedAPI } from "@/lib/api";

function App() {
  useEffect(() => {
    seedAPI.seed().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <div className="App min-h-screen bg-[#050505]">
        <BrowserRouter>
          <Navbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/matches/:id" element={<MatchDetail />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
