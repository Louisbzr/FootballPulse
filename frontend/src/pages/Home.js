import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesAPI, leaderboardAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MatchCard from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Trophy, Target, ArrowRight, TrendingUp, Activity } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    matchesAPI.list().then(r => setMatches(r.data)).catch(() => {});
    leaderboardAPI.get().then(r => setLeaders(r.data?.slice(0, 5) || [])).catch(() => {});
  }, []);

  const upcoming = matches.filter(m => m.status === 'upcoming').slice(0, 3);
  const finished = matches.filter(m => m.status === 'finished').slice(0, 3);

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-b from-[#39FF14]/3 via-transparent to-[#050505]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556816213-00d1ffaa2f78?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04]" />
        <div className="relative max-w-7xl mx-auto px-4 pt-24 pb-20">
          <div className="max-w-3xl">
            <Badge className="bg-[#39FF14]/10 text-[#39FF14] mb-6 rounded-sm text-xs font-bold uppercase tracking-widest px-3 py-1">
              Live Football Analytics
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white leading-[0.9] mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Analyze.<br />
              <span className="text-[#39FF14] neon-text">Predict.</span><br />
              Dominate.
            </h1>
            <p className="text-base md:text-lg text-gray-400 leading-relaxed mb-8 max-w-xl">
              Dive into match statistics, place virtual predictions, earn XP and climb the global leaderboard. Your football intelligence starts here.
            </p>
            <div className="flex flex-wrap gap-3">
              {!user ? (
                <Link to="/register">
                  <Button className="bg-[#39FF14] text-black font-bold uppercase tracking-wider hover:bg-[#39FF14]/90 hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all rounded-sm skew-btn px-8 py-5 text-sm" data-testid="hero-signup-btn">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Get Started</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/predictions">
                  <Button className="bg-[#39FF14] text-black font-bold uppercase tracking-wider hover:bg-[#39FF14]/90 rounded-sm skew-btn px-8 py-5 text-sm" data-testid="hero-predictions-btn">
                    <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Place Predictions</span>
                  </Button>
                </Link>
              )}
              <Link to="/matches">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-sm px-8 py-5 text-sm" data-testid="hero-matches-btn">
                  View Matches
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mt-16 max-w-md">
            {[
              { value: matches.length || '8+', label: 'Matches', icon: Activity },
              { value: '1,000', label: 'Starting Credits', icon: TrendingUp },
              { value: leaders.length || '0', label: 'Competitors', icon: Trophy },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 text-[#39FF14] mx-auto mb-1" />
                <p className="text-xl font-bold text-white font-mono-data">{value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Matches */}
      {upcoming.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12" data-testid="upcoming-matches-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Upcoming Matches
            </h2>
            <Link to="/matches" className="text-sm text-gray-500 hover:text-[#39FF14] flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {finished.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12" data-testid="recent-results-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Recent Results
            </h2>
            <Link to="/matches?status=finished" className="text-sm text-gray-500 hover:text-[#39FF14] flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            {finished.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Leaderboard Preview */}
      {leaders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 pb-20" data-testid="leaderboard-preview-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Top Predictors
            </h2>
            <Link to="/leaderboard" className="text-sm text-gray-500 hover:text-[#39FF14] flex items-center gap-1 transition-colors">
              Full leaderboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {leaders.map((l, i) => (
              <div key={l.id} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''} hover:bg-white/[0.02] transition-colors`}>
                <span className={`text-lg font-bold font-mono-data w-8 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-[#CD7F32]' : 'text-gray-500'}`}>
                  #{l.rank}
                </span>
                <Avatar className="w-8 h-8 border border-white/10">
                  <AvatarImage src={l.avatar} />
                  <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-xs">{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{l.username}</p>
                  <p className="text-[10px] text-gray-500">{l.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono-data text-[#39FF14]">{l.xp} XP</p>
                  <p className="text-[10px] text-gray-500">{l.wins}W - {l.win_rate}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
