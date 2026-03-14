import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, badgesAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Coins, TrendingUp, Target, Award, MessageCircle, Loader2, Zap, Trophy, Flame, Brain, BookOpen, Package } from 'lucide-react';
import api from '@/lib/api';

const BADGE_ICONS = {
  top_predictor: Trophy,
  hot_streak: Flame,
  tactician: Brain,
  football_brain: MessageCircle,
};

const BADGE_COLORS = {
  top_predictor: '#FFD700',
  hot_streak: '#FF0055',
  tactician: '#00F0FF',
  football_brain: '#A78BFA',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-2 text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
      <p className="font-mono-data" style={{ color: 'var(--accent)' }}>{payload[0]?.value}</p>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [allBadges, setAllBadges] = useState({});
  const [loading, setLoading] = useState(true);
  const [collectionCount, setCollectionCount] = useState(0);
  const [dailyStatus, setDailyStatus] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dashboardAPI.get(),
      badgesAPI.list(),
      api.get('/collection').catch(() => ({ data: [] })),
      api.get('/daily-status').catch(() => ({ data: null })),
    ]).then(([d, b, c, ds]) => {
      setData(d.data);
      setAllBadges(b.data);
      setCollectionCount(c.data?.filter(p => p.owned)?.length || 0);
      setDailyStatus(ds.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  if (!data) return null;

  const { stats, xp_progress, recent_bets, badges } = data;
  const betHistory = (recent_bets || []).map((b, i) => ({
    name: `#${recent_bets.length - i}`,
    value: b.status === 'won' ? b.potential_win : b.status === 'lost' ? -b.amount : 0,
  })).reverse();

  const statCards = [
    { label: 'Crédits', value: data.user?.virtual_credits?.toLocaleString(), icon: Coins, color: 'var(--accent-gold)' },
    { label: 'Taux de réussite', value: `${stats.win_rate}%`, icon: TrendingUp, color: 'var(--accent)' },
    { label: 'Total paris', value: stats.total_bets, icon: Target, color: 'var(--accent-secondary)' },
    { label: 'Collection', value: `${collectionCount}/40`, icon: BookOpen, color: '#A855F7' },
    { label: 'Série', value: `${dailyStatus?.streak || 0}j`, icon: Flame, color: 'var(--accent-danger)' },
    { label: 'Commentaires', value: stats.comments, icon: MessageCircle, color: 'var(--text-muted)' },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          Tableau de bord
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bon retour, <span style={{ color: 'var(--text-primary)' }}>{data.user?.username}</span></p>
      </div>

      {/* XP Progress */}
      <Card className="border p-5 mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="xp-progress-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
                {xp_progress.current_level}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{xp_progress.current_xp} / {xp_progress.xp_for_next || '\u221E'} XP</p>
            </div>
          </div>
          {xp_progress.next_level && (
            <Badge className="text-xs rounded-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              Suivant : {xp_progress.next_level}
            </Badge>
          )}
        </div>
        <Progress value={Math.min(xp_progress.progress, 100)} className="h-2" style={{ background: 'var(--bg-elevated)' }} data-testid="xp-progress-bar" />
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 stagger-children" data-testid="stat-cards">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border p-4 animate-fadeInUp" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <p className="text-2xl font-bold font-mono-data" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bet History Chart */}
        <Card className="lg:col-span-2 border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="bet-history-chart">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Performance des paris
          </h3>
          {betHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={betHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>Aucun historique de paris</p>
          )}
        </Card>

        {/* Badges */}
        <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="badges-card">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            <Award className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent-gold)' }} />Badges
          </h3>
          <div className="space-y-3">
            {Object.entries(allBadges).map(([key, info]) => {
              const earned = badges?.includes(key);
              const Icon = BADGE_ICONS[key] || Award;
              const color = BADGE_COLORS[key] || '#888';
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${earned ? '' : 'opacity-40'}`} style={{ borderColor: earned ? 'var(--border-hover)' : 'var(--border-default)', background: earned ? 'color-mix(in srgb, var(--bg-elevated) 50%, transparent)' : 'transparent' }} data-testid={`badge-${key}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{info.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{info.description}</p>
                  </div>
                  {earned && <Badge className="text-[10px] rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>Obtenu</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Bets */}
      {recent_bets?.length > 0 && (
        <Card className="border p-5 mt-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="recent-bets-list">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Pronostics récents
          </h3>
          <div className="space-y-2">
            {recent_bets.map(bet => (
              <div key={bet.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border-default)' }} data-testid={`recent-bet-${bet.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{bet.match_label}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{bet.bet_type.replace(/_/g, ' ')}: {bet.prediction}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-data text-xs" style={{ color: 'var(--text-secondary)' }}>{bet.amount} x{bet.odds}</p>
                  <Badge className={`text-[10px] rounded-sm ${
                    bet.status === 'won' ? 'bg-[#39FF14]/10 text-[#39FF14]' : bet.status === 'lost' ? 'bg-[#FF0055]/10 text-[#FF0055]' : 'bg-[#FFD700]/10 text-[#FFD700]'
                  }`}>{bet.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
