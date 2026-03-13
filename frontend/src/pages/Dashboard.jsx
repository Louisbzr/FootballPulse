import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, badgesAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Coins, TrendingUp, Target, Award, MessageCircle, Loader2, Zap, Trophy, Flame, Brain } from 'lucide-react';

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
    <div className="bg-[#1E1E1E] border border-[#39FF14]/20 rounded-lg p-2 text-xs">
      <p className="font-mono-data text-[#39FF14]">{payload[0]?.value}</p>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [allBadges, setAllBadges] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      dashboardAPI.get(),
      badgesAPI.list(),
    ]).then(([d, b]) => {
      setData(d.data);
      setAllBadges(b.data);
    }).catch(() => navigate('/login')).finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>;
  if (!data) return null;

  const { stats, xp_progress, recent_bets, badges } = data;
  const betHistory = (recent_bets || []).map((b, i) => ({
    name: `#${recent_bets.length - i}`,
    value: b.status === 'won' ? b.potential_win : b.status === 'lost' ? -b.amount : 0,
  })).reverse();

  const statCards = [
    { label: 'Credits', value: data.user?.virtual_credits?.toLocaleString(), icon: Coins, color: '#FFD700' },
    { label: 'Win Rate', value: `${stats.win_rate}%`, icon: TrendingUp, color: '#39FF14' },
    { label: 'Total Bets', value: stats.total_bets, icon: Target, color: '#00F0FF' },
    { label: 'Comments', value: stats.comments, icon: MessageCircle, color: '#A78BFA' },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, <span className="text-white">{data.user?.username}</span></p>
      </div>

      {/* XP Progress */}
      <Card className="bg-[#121212] border-white/5 p-5 mb-6" data-testid="xp-progress-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#39FF14]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#39FF14]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {xp_progress.current_level}
              </p>
              <p className="text-xs text-gray-500">{xp_progress.current_xp} / {xp_progress.xp_for_next || '\u221E'} XP</p>
            </div>
          </div>
          {xp_progress.next_level && (
            <Badge className="bg-white/5 text-gray-400 text-xs rounded-sm">
              Next: {xp_progress.next_level}
            </Badge>
          )}
        </div>
        <Progress value={Math.min(xp_progress.progress, 100)} className="h-2 bg-[#1E1E1E]" data-testid="xp-progress-bar" />
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children" data-testid="stat-cards">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-[#121212] border-white/5 p-4 animate-fadeInUp" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold font-mono-data text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bet History Chart */}
        <Card className="lg:col-span-2 bg-[#121212] border-white/5 p-5" data-testid="bet-history-chart">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Bet Performance
          </h3>
          {betHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={betHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#39FF14" fill="#39FF14" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-600 text-sm py-10 text-center">No bet history yet</p>
          )}
        </Card>

        {/* Badges */}
        <Card className="bg-[#121212] border-white/5 p-5" data-testid="badges-card">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            <Award className="w-4 h-4 inline mr-2 text-[#FFD700]" />Badges
          </h3>
          <div className="space-y-3">
            {Object.entries(allBadges).map(([key, info]) => {
              const earned = badges?.includes(key);
              const Icon = BADGE_ICONS[key] || Award;
              const color = BADGE_COLORS[key] || '#888';
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${earned ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 opacity-40'}`} data-testid={`badge-${key}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{info.name}</p>
                    <p className="text-[10px] text-gray-500">{info.description}</p>
                  </div>
                  {earned && <Badge className="bg-[#39FF14]/10 text-[#39FF14] text-[10px] rounded-sm">Earned</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Bets */}
      {recent_bets?.length > 0 && (
        <Card className="bg-[#121212] border-white/5 p-5 mt-6" data-testid="recent-bets-list">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Recent Predictions
          </h3>
          <div className="space-y-2">
            {recent_bets.map(bet => (
              <div key={bet.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0" data-testid={`recent-bet-${bet.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{bet.match_label}</p>
                  <p className="text-xs text-gray-500 capitalize">{bet.bet_type.replace(/_/g, ' ')}: {bet.prediction}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-data text-xs text-gray-400">{bet.amount} x{bet.odds}</p>
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
