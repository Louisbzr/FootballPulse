import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesAPI, betsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MatchCard from '@/components/MatchCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Target, TrendingUp, Loader2 } from 'lucide-react';

export default function Predictions() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      matchesAPI.list({ status: 'upcoming' }),
      user ? betsAPI.my() : Promise.resolve({ data: [] }),
    ]).then(([m, b]) => {
      setMatches(m.data);
      setMyBets(b.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const STATUS_STYLES = {
    pending: 'bg-[#FFD700]/10 text-[#FFD700]',
    won: 'bg-[#39FF14]/10 text-[#39FF14]',
    lost: 'bg-[#FF0055]/10 text-[#FF0055]',
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="predictions-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Pronostics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Placez vos paris virtuels et gagnez des crédits</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
            <Coins className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-mono-data text-lg" style={{ color: 'var(--accent-gold)' }} data-testid="prediction-credits">{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matches to bet on */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              <Target className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent)' }} />
              Matchs disponibles
            </h2>
            {matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {matches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            ) : (
              <Card className="border p-10 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Aucun match à venir disponible</p>
              </Card>
            )}
          </div>

          {/* My Bets */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              <TrendingUp className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent-secondary)' }} />
              Mes pronostics
            </h2>
            {!user ? (
              <Card className="border p-6 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Connectez-vous pour voir vos pronostics</p>
                <Link to="/login" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>Se connecter</Link>
              </Card>
            ) : myBets.length > 0 ? (
              <div className="space-y-2">
                {myBets.slice(0, 10).map(bet => (
                  <Card key={bet.id} className="border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid={`bet-${bet.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bet.match_label}</span>
                      <Badge className={`${STATUS_STYLES[bet.status]} text-[10px] rounded-sm`}>{bet.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{bet.bet_type.replace(/_/g, ' ')}: <span style={{ color: 'var(--text-secondary)' }}>{bet.prediction}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-data text-xs" style={{ color: 'var(--text-secondary)' }}>{bet.amount} <span style={{ color: 'var(--accent-gold)' }}>x{bet.odds}</span></p>
                        <p className="font-mono-data text-xs" style={{ color: 'var(--accent)' }}>{bet.potential_win}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border p-6 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun pronostic. Cliquez sur un match pour commencer !</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
