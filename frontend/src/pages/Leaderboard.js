import { useEffect, useState } from 'react';
import { leaderboardAPI, weeklyLeaderboardAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Crown, TrendingUp, Loader2, Calendar } from 'lucide-react';

const RANK_STYLES = {
  1: { icon: Crown, color: '#FFD700', bg: 'bg-[#FFD700]/5 border-[#FFD700]/20' },
  2: { icon: Medal, color: '#C0C0C0', bg: 'bg-gray-500/5 border-gray-500/20' },
  3: { icon: Medal, color: '#CD7F32', bg: 'bg-[#CD7F32]/5 border-[#CD7F32]/20' },
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === 'weekly' ? weeklyLeaderboardAPI.get() : leaderboardAPI.get();
    fetcher.then(r => setLeaders(r.data)).catch(() => setLeaders([])).finally(() => setLoading(false));
  }, [tab]);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const isWeekly = tab === 'weekly';

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8" data-testid="leaderboard-page">
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        Leaderboard
      </h1>
      <p className="text-gray-500 text-sm mb-6">Top predictors ranked by {isWeekly ? 'weekly wins' : 'XP'}</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#121212] border border-white/5 mb-8 w-fit" data-testid="leaderboard-tabs">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTab('all')}
          className={`text-xs rounded-md gap-1.5 ${tab === 'all' ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-gray-400 hover:text-white'}`}
          data-testid="tab-all-time"
        >
          <Trophy className="w-3.5 h-3.5" /> All Time
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTab('weekly')}
          className={`text-xs rounded-md gap-1.5 ${tab === 'weekly' ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'text-gray-400 hover:text-white'}`}
          data-testid="tab-weekly"
        >
          <Calendar className="w-3.5 h-3.5" /> This Week
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-8" data-testid="top3-podium">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((l) => {
                const rank = RANK_STYLES[l.rank] || {};
                return (
                  <Card key={l.id} className={`bg-[#121212] border ${rank.bg || 'border-white/5'} p-5 text-center ${l.rank === 1 ? 'md:-mt-4' : ''}`}>
                    <div className="relative inline-block mb-3">
                      <Avatar className="w-14 h-14 border-2 mx-auto" style={{ borderColor: rank.color || '#333' }}>
                        <AvatarImage src={l.avatar} />
                        <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14]">{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: rank.color || '#333' }}>
                        <span className="text-xs font-bold text-black">{l.rank}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{l.username}</p>
                    <Badge className="mt-1 text-[10px] bg-white/5 text-gray-400 rounded-sm">{l.level}</Badge>
                    <p className="font-mono-data text-lg text-[#39FF14] mt-2">
                      {isWeekly ? `${l.wins}W` : `${l.xp} XP`}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-500">
                      {isWeekly ? (
                        <>
                          <span>{l.win_rate}%</span>
                          <span className={l.profit >= 0 ? 'text-[#39FF14]' : 'text-[#FF0055]'}>{l.profit >= 0 ? '+' : ''}{l.profit}</span>
                        </>
                      ) : (
                        <>
                          <span>{l.wins}W</span>
                          <span>{l.win_rate}%</span>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <Card className="bg-[#121212] border-white/5 overflow-hidden" data-testid="leaderboard-table">
              <div className={`grid gap-2 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5 ${
                isWeekly ? 'grid-cols-[3rem_1fr_5rem_5rem_5rem]' : 'grid-cols-[3rem_1fr_5rem_5rem_5rem] md:grid-cols-[3rem_1fr_6rem_6rem_6rem_5rem]'
              }`}>
                <span>#</span>
                <span>Player</span>
                <span className="text-right">{isWeekly ? 'Wins' : 'XP'}</span>
                <span className="text-right">{isWeekly ? 'Bets' : 'Wins'}</span>
                <span className="text-right">Rate</span>
                {!isWeekly && <span className="text-right hidden md:block">Credits</span>}
              </div>
              {rest.map((l) => (
                <div key={l.id} className={`grid gap-2 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                  isWeekly ? 'grid-cols-[3rem_1fr_5rem_5rem_5rem]' : 'grid-cols-[3rem_1fr_5rem_5rem_5rem] md:grid-cols-[3rem_1fr_6rem_6rem_6rem_5rem]'
                }`} data-testid={`leaderboard-row-${l.rank}`}>
                  <span className="font-mono-data text-sm text-gray-500">{l.rank}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-7 h-7 border border-white/10 shrink-0">
                      <AvatarImage src={l.avatar} />
                      <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-[10px]">{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{l.username}</p>
                      <p className="text-[10px] text-gray-600">{l.level}</p>
                    </div>
                  </div>
                  <span className="font-mono-data text-sm text-[#39FF14] text-right">{isWeekly ? l.wins : l.xp}</span>
                  <span className="font-mono-data text-sm text-white text-right">{isWeekly ? l.total_bets : l.wins}</span>
                  <span className="font-mono-data text-sm text-gray-400 text-right">{l.win_rate}%</span>
                  {!isWeekly && <span className="font-mono-data text-sm text-[#FFD700] text-right hidden md:block">{l.virtual_credits?.toLocaleString()}</span>}
                </div>
              ))}
            </Card>
          )}

          {leaders.length === 0 && (
            <Card className="bg-[#121212] border-white/5 p-16 text-center">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">{isWeekly ? 'Aucun pari cette semaine' : 'Aucun joueur. Soyez le premier !'}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
