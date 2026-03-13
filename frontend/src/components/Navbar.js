import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Trophy, BarChart3, Target, User, LogOut, Menu, X, Coins, Package, Flame, BookOpen, ArrowRightLeft, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const NAV_ITEMS = [
  { to: '/matches', label: 'Matches', icon: BarChart3 },
  { to: '/predictions', label: 'Predictions', icon: Target },
  { to: '/packs', label: 'Packs', icon: Package },
  { to: '/trading', label: 'Trading', icon: ArrowRightLeft },
  { to: '/challenge', label: 'Challenge', icon: Gift },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/daily-status').then(r => setStreak(r.data.streak || 0)).catch(() => {});
    }
  }, [user]);

  return (
    <nav data-testid="navbar" className="fixed top-0 left-0 right-0 z-50 h-16 glass-card border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-8 h-8 rounded bg-[#39FF14] flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-shadow">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            MATCH<span className="text-[#39FF14]">PULSE</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} data-testid={`nav-${label.toLowerCase()}`}>
              <Button
                variant="ghost"
                className={`gap-2 text-sm font-medium rounded-sm transition-all ${
                  location.pathname === to
                    ? 'text-[#39FF14] bg-[#39FF14]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {streak > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-[#FF0055]/10 border border-[#FF0055]/20">
                  <Flame className="w-3.5 h-3.5 text-[#FF0055]" />
                  <span className="font-mono-data text-xs text-[#FF0055]" data-testid="streak-badge">{streak}</span>
                </div>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#1E1E1E] border border-white/5">
                <Coins className="w-4 h-4 text-[#FFD700]" />
                <span className="font-mono-data text-sm text-[#FFD700]" data-testid="user-credits">
                  {user.virtual_credits?.toLocaleString()}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="user-menu-trigger">
                    <Avatar className="w-8 h-8 border border-white/10">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-xs">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-[#121212] border-white/10 text-white" align="end">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.level} - {user.xp} XP</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/dashboard')} data-testid="nav-dashboard-link">
                    <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/profile')} data-testid="nav-profile-link">
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/collection')} data-testid="nav-collection-link">
                    <BookOpen className="w-4 h-4 mr-2" /> Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-[#FF0055]" onClick={() => { logout(); navigate('/'); }} data-testid="nav-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-400 hover:text-white text-sm" data-testid="nav-login">Login</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-[#39FF14] text-black hover:bg-[#39FF14]/90 text-sm font-bold skew-btn rounded-sm px-5" data-testid="nav-register">
                  <span>Sign Up</span>
                </Button>
              </Link>
            </div>
          )}
          {/* Mobile toggle */}
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-card border-t border-white/5 p-4 space-y-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5">
                <BarChart3 className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5">
                <User className="w-4 h-4" /> Profile
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
