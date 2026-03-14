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
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
        Classement
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Meilleurs pronostiqueurs classés par {isWeekly ? 'victoires de la semaine' : 'XP'}</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg border mb-8 w-fit" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="leaderboard-tabs">
        <Button size="sm" variant="ghost" onClick={() => setTab('all')}
          className="text-xs rounded-md gap-1.5"
          style={{ color: tab === 'all' ? 'var(--accent)' : 'var(--text-secondary)', background: tab === 'all' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent' }}
          data-testid="tab-all-time">
          <Trophy className="w-3.5 h-3.5" /> Tous les temps
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setTab('weekly')}
          className="text-xs rounded-md gap-1.5"
          style={{ color: tab === 'weekly' ? 'var(--accent-secondary)' : 'var(--text-secondary)', background: tab === 'weekly' ? 'color-mix(in srgb, var(--accent-secondary) 10%, transparent)' : 'transparent' }}
          data-testid="tab-weekly">
          <Calendar className="w-3.5 h-3.5" /> Cette semaine
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-8" data-testid="top3-podium">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((l) => {
                const rank = RANK_STYLES[l.rank] || {};
                return (
                  <Card key={l.id} className={`border p-5 text-center ${l.rank === 1 ? 'md:-mt-4' : ''} ${rank.bg || ''}`} style={{ background: 'var(--bg-card)', borderColor: rank.color ? undefined : 'var(--border-default)' }}>
                    <div className="relative inline-block mb-3">
                      <Avatar className="w-14 h-14 border-2 mx-auto" style={{ borderColor: rank.color || 'var(--border-default)' }}>
                        <AvatarImage src={l.avatar} />
                        <AvatarFallback style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: rank.color || '#333' }}>
                        <span className="text-xs font-bold text-black">{l.rank}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{l.username}</p>
                    <Badge className="mt-1 text-[10px] rounded-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{l.level}</Badge>
                    <p className="font-mono-data text-lg mt-2" style={{ color: 'var(--accent)' }}>
                      {isWeekly ? `${l.wins}W` : `${l.xp} XP`}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {isWeekly ? (
                        <>
                          <span>{l.win_rate}%</span>
                          <span style={{ color: l.profit >= 0 ? 'var(--accent)' : 'var(--accent-danger)' }}>{l.profit >= 0 ? '+' : ''}{l.profit}</span>
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
            <Card className="border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="leaderboard-table">
              <div className={`grid gap-2 px-4 py-2 text-[10px] uppercase tracking-wider border-b ${
                isWeekly ? 'grid-cols-[3rem_1fr_5rem_5rem_5rem]' : 'grid-cols-[3rem_1fr_5rem_5rem_5rem] md:grid-cols-[3rem_1fr_6rem_6rem_6rem_5rem]'
              }`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}>
                <span>#</span>
                <span>Joueur</span>
                <span className="text-right">{isWeekly ? 'Victoires' : 'XP'}</span>
                <span className="text-right">{isWeekly ? 'Paris' : 'Victoires'}</span>
                <span className="text-right">Taux</span>
                {!isWeekly && <span className="text-right hidden md:block">Crédits</span>}
              </div>
              {rest.map((l) => (
                <div key={l.id} className={`grid gap-2 px-4 py-3 items-center border-b hover:opacity-90 transition-colors ${
                  isWeekly ? 'grid-cols-[3rem_1fr_5rem_5rem_5rem]' : 'grid-cols-[3rem_1fr_5rem_5rem_5rem] md:grid-cols-[3rem_1fr_6rem_6rem_6rem_5rem]'
                }`} style={{ borderColor: 'var(--border-default)' }} data-testid={`leaderboard-row-${l.rank}`}>
                  <span className="font-mono-data text-sm" style={{ color: 'var(--text-muted)' }}>{l.rank}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-7 h-7 border shrink-0" style={{ borderColor: 'var(--border-default)' }}>
                      <AvatarImage src={l.avatar} />
                      <AvatarFallback className="text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{l.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{l.username}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.level}</p>
                    </div>
                  </div>
                  <span className="font-mono-data text-sm text-right" style={{ color: 'var(--accent)' }}>{isWeekly ? l.wins : l.xp}</span>
                  <span className="font-mono-data text-sm text-right" style={{ color: 'var(--text-primary)' }}>{isWeekly ? l.total_bets : l.wins}</span>
                  <span className="font-mono-data text-sm text-right" style={{ color: 'var(--text-secondary)' }}>{l.win_rate}%</span>
                  {!isWeekly && <span className="font-mono-data text-sm text-right hidden md:block" style={{ color: 'var(--accent-gold)' }}>{l.virtual_credits?.toLocaleString()}</span>}
                </div>
              ))}
            </Card>
          )}

          {leaders.length === 0 && (
            <Card className="border p-16 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <Trophy className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>{isWeekly ? 'Aucun pari cette semaine' : 'Aucun joueur. Soyez le premier !'}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
