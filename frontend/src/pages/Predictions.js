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
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Predictions
          </h1>
          <p className="text-gray-500 text-sm mt-1">Place virtual bets and earn credits</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] border border-white/5">
            <Coins className="w-4 h-4 text-[#FFD700]" />
            <span className="font-mono-data text-lg text-[#FFD700]" data-testid="prediction-credits">{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matches to bet on */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              <Target className="w-4 h-4 inline mr-2 text-[#39FF14]" />
              Available Matches
            </h2>
            {matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {matches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            ) : (
              <Card className="bg-[#121212] border-white/5 p-10 text-center">
                <p className="text-gray-500">No upcoming matches available</p>
              </Card>
            )}
          </div>

          {/* My Bets */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              <TrendingUp className="w-4 h-4 inline mr-2 text-[#00F0FF]" />
              My Predictions
            </h2>
            {!user ? (
              <Card className="bg-[#121212] border-white/5 p-6 text-center">
                <p className="text-gray-500 text-sm mb-3">Login to see your predictions</p>
                <Link to="/login" className="text-[#39FF14] text-sm hover:underline">Sign in</Link>
              </Card>
            ) : myBets.length > 0 ? (
              <div className="space-y-2">
                {myBets.slice(0, 10).map(bet => (
                  <Card key={bet.id} className="bg-[#121212] border-white/5 p-3" data-testid={`bet-${bet.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{bet.match_label}</span>
                      <Badge className={`${STATUS_STYLES[bet.status]} text-[10px] rounded-sm`}>{bet.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white capitalize">{bet.bet_type.replace(/_/g, ' ')}: <span className="text-gray-300">{bet.prediction}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-data text-xs text-gray-400">{bet.amount} <span className="text-[#FFD700]">x{bet.odds}</span></p>
                        <p className="font-mono-data text-xs text-[#39FF14]">{bet.potential_win}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-[#121212] border-white/5 p-6 text-center">
                <p className="text-gray-500 text-sm">No predictions yet. Click a match to get started!</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
