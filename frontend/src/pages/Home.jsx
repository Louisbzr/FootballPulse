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
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(var(--accent-rgb, 57,255,20), 0.03), transparent, var(--bg-primary))' }} />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556816213-00d1ffaa2f78?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04]" />
        <div className="relative max-w-7xl mx-auto px-4 pt-24 pb-20">
          <div className="max-w-3xl">
            <Badge className="mb-6 rounded-sm text-xs font-bold uppercase tracking-widest px-3 py-1" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>
              Analyse Football en Direct
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-6" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              Analysez.<br />
              <span className="neon-text" style={{ color: 'var(--accent)' }}>Prédisez.</span><br />
              Dominez.
            </h1>
            <p className="text-base md:text-lg leading-relaxed mb-8 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              Plongez dans les statistiques de matchs, placez vos pronostics virtuels, gagnez de l'XP et grimpez dans le classement mondial. Votre intelligence football commence ici.
            </p>
            <div className="flex flex-wrap gap-3">
              {!user ? (
                <Link to="/register">
                  <Button className="font-bold uppercase tracking-wider hover:opacity-90 transition-all rounded-sm skew-btn px-8 py-5 text-sm" style={{ background: 'var(--accent)', color: '#000' }} data-testid="hero-signup-btn">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Commencer</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/predictions">
                  <Button className="font-bold uppercase tracking-wider hover:opacity-90 rounded-sm skew-btn px-8 py-5 text-sm" style={{ background: 'var(--accent)', color: '#000' }} data-testid="hero-predictions-btn">
                    <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Placer un pronostic</span>
                  </Button>
                </Link>
              )}
              <Link to="/matches">
                <Button variant="outline" className="rounded-sm px-8 py-5 text-sm" style={{ borderColor: 'var(--border-hover)', color: 'var(--text-primary)' }} data-testid="hero-matches-btn">
                  Voir les matchs
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mt-16 max-w-md">
            {[
              { value: matches.length || '8+', label: 'Matchs', icon: Activity },
              { value: '1 000', label: 'Crédits de départ', icon: TrendingUp },
              { value: leaders.length || '0', label: 'Compétiteurs', icon: Trophy },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
                <p className="text-xl font-bold font-mono-data" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matchs à venir */}
      {upcoming.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12" data-testid="upcoming-matches-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              Matchs à venir
            </h2>
            <Link to="/matches" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Résultats récents */}
      {finished.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12" data-testid="recent-results-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              Résultats récents
            </h2>
            <Link to="/matches?status=finished" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            {finished.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Classement */}
      {leaders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 pb-20" data-testid="leaderboard-preview-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              Meilleurs pronostiqueurs
            </h2>
            <Link to="/leaderboard" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
              Classement complet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            {leaders.map((l, i) => (
              <div key={l.id} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t' : ''} hover:opacity-90 transition-colors`} style={{ borderColor: 'var(--border-default)' }}>
                <span className={`text-lg font-bold font-mono-data w-8 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-[#CD7F32]' : ''}`} style={i > 2 ? { color: 'var(--text-muted)' } : {}}>
                  #{l.rank}
                </span>
                <Avatar className="w-8 h-8 border" style={{ borderColor: 'var(--border-default)' }}>
                  <AvatarImage src={l.avatar} />
                  <AvatarFallback style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }} className="text-xs">{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{l.username}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono-data" style={{ color: 'var(--accent)' }}>{l.xp} XP</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.wins}V - {l.win_rate}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
