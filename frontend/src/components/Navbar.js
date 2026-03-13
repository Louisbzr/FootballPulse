import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Trophy, BarChart3, Target, User, LogOut, Menu, X, Coins, Package, Flame, BookOpen, ArrowRightLeft, Gift, Sun, Moon } from 'lucide-react';
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
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const isLight = theme === 'light';

  useEffect(() => {
    if (user) {
      api.get('/daily-status').then(r => setStreak(r.data.streak || 0)).catch(() => {});
    }
  }, [user]);

  return (
    <nav data-testid="navbar" className="fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl" style={{ background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(10,10,10,0.8)', borderColor: 'var(--border-default)' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-8 h-8 rounded flex items-center justify-center transition-shadow" style={{ background: 'var(--accent)' }}>
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            MATCH<span style={{ color: 'var(--accent)' }}>PULSE</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} data-testid={`nav-${label.toLowerCase()}`}>
              <Button
                variant="ghost"
                className="gap-2 text-sm font-medium rounded-sm transition-all"
                style={{
                  color: location.pathname === to ? 'var(--accent)' : 'var(--text-secondary)',
                  background: location.pathname === to ? (isLight ? 'rgba(22,163,74,0.08)' : 'rgba(57,255,20,0.1)') : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}
            data-testid="theme-toggle"
          >
            {isLight ? <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> : <Sun className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />}
          </button>

          {user ? (
            <>
              {streak > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm" style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.2)' }}>
                  <Flame className="w-3.5 h-3.5 text-[#FF0055]" />
                  <span className="font-mono-data text-xs text-[#FF0055]" data-testid="streak-badge">{streak}</span>
                </div>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <Coins className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                <span className="font-mono-data text-sm" style={{ color: 'var(--accent-gold)' }} data-testid="user-credits">
                  {user.virtual_credits?.toLocaleString()}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="user-menu-trigger">
                    <Avatar className="w-8 h-8 border" style={{ borderColor: 'var(--border-default)' }}>
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }} className="text-xs">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} align="end">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.level} - {user.xp} XP</p>
                  </div>
                  <DropdownMenuSeparator style={{ background: 'var(--border-default)' }} />
                  <DropdownMenuItem className="cursor-pointer" style={{ color: 'var(--text-primary)' }} onClick={() => navigate('/dashboard')} data-testid="nav-dashboard-link">
                    <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" style={{ color: 'var(--text-primary)' }} onClick={() => navigate('/profile')} data-testid="nav-profile-link">
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" style={{ color: 'var(--text-primary)' }} onClick={() => navigate('/collection')} data-testid="nav-collection-link">
                    <BookOpen className="w-4 h-4 mr-2" /> Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: 'var(--border-default)' }} />
                  <DropdownMenuItem className="cursor-pointer text-[#FF0055]" onClick={() => { logout(); navigate('/'); }} data-testid="nav-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-sm" style={{ color: 'var(--text-secondary)' }} data-testid="nav-login">Login</Button>
              </Link>
              <Link to="/register">
                <Button className="text-sm font-bold rounded-sm px-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="nav-register">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
          {/* Mobile toggle */}
          <button className="md:hidden hover:opacity-80" style={{ color: 'var(--text-secondary)' }} onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden p-4 space-y-2 border-t backdrop-blur-xl" style={{ background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,10,0.95)', borderColor: 'var(--border-default)' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded" style={{ color: 'var(--text-secondary)' }}>
                <BarChart3 className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/collection" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen className="w-4 h-4" /> Collection
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
