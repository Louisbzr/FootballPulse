import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { missionsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Package, MessageCircle, ArrowRightLeft, Flame, Coins, Star, Loader2, Clock, Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const ICON_MAP = {
  trophy: Trophy, target: Target, package: Package,
  'message-circle': MessageCircle, 'arrow-right-left': ArrowRightLeft,
  flame: Flame, coins: Coins, star: Star,
};

const CATEGORY_COLORS = {
  bets: '#39FF14',
  packs: '#A855F7',
  social: '#00F0FF',
  trading: '#FF8C00',
  daily: '#FF0055',
  credits: '#FFD700',
};

export default function Missions() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const loadMissions = async () => {
    try {
      const res = await missionsAPI.get();
      setData(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { if (user) loadMissions(); else setLoading(false); }, [user]);

  const handleClaim = async (missionId) => {
    setClaiming(missionId);
    try {
      const res = await missionsAPI.claim(missionId);
      toast.success(res.data.message);
      await loadMissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setClaiming(null);
  };

  const getTimeRemaining = () => {
    if (!data?.week_end) return '';
    const end = new Date(data.week_end);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 'Réinitialisation imminente';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}j ${hours}h restantes`;
    return `${hours}h restantes`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4" data-testid="missions-login-prompt">
      <Trophy className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>Connectez-vous pour voir vos missions</p>
      <Link to="/login"><Button style={{ background: 'var(--accent)', color: '#000' }}>Se connecter</Button></Link>
    </div>
  );

  const missions = data?.missions || [];
  const completedCount = missions.filter(m => m.completed).length;
  const claimedCount = missions.filter(m => m.claimed).length;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8" data-testid="missions-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }} data-testid="missions-title">
            <Target className="w-8 h-8 inline mr-3" style={{ color: 'var(--accent)' }} />
            Missions
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Complétez des défis hebdomadaires pour gagner des récompenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="rounded-sm text-xs py-1 px-3" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }} data-testid="missions-week">
            Semaine {data?.week?.split('-W')[1]}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono-data">{getTimeRemaining()}</span>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="border p-5 mb-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="missions-summary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Progression hebdomadaire
          </h3>
          <span className="font-mono-data text-sm" style={{ color: 'var(--accent)' }}>
            {completedCount}/{missions.length} complétées
          </span>
        </div>
        <Progress value={(completedCount / Math.max(missions.length, 1)) * 100} className="h-2" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {claimedCount} réclamée{claimedCount > 1 ? 's' : ''}
          </span>
          <span className="text-[10px] font-mono-data" style={{ color: 'var(--accent-gold)' }}>
            {missions.reduce((acc, m) => acc + (m.claimed ? m.reward : 0), 0)} crédits gagnés
          </span>
        </div>
      </Card>

      {/* Missions Grid */}
      <div className="space-y-3" data-testid="missions-list">
        {missions.map(mission => {
          const Icon = ICON_MAP[mission.icon] || Target;
          const catColor = CATEGORY_COLORS[mission.category] || 'var(--accent)';
          const pct = Math.min((mission.progress / mission.target) * 100, 100);

          return (
            <Card
              key={mission.id}
              className="border p-4 transition-all"
              style={{
                background: mission.claimed ? 'color-mix(in srgb, var(--accent) 3%, var(--bg-card))' : 'var(--bg-card)',
                borderColor: mission.completed && !mission.claimed ? catColor : 'var(--border-default)',
                opacity: mission.claimed ? 0.7 : 1,
              }}
              data-testid={`mission-${mission.id}`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${catColor} 10%, transparent)` }}>
                  {mission.claimed ? (
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                  ) : (
                    <Icon className="w-6 h-6" style={{ color: catColor }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
                      {mission.name}
                    </h4>
                    <Badge className="text-[9px] rounded-sm" style={{ background: `color-mix(in srgb, ${catColor} 10%, transparent)`, color: catColor }}>
                      {mission.category === 'bets' ? 'Paris' : mission.category === 'packs' ? 'Packs' : mission.category === 'social' ? 'Social' : mission.category === 'trading' ? 'Échange' : mission.category === 'daily' ? 'Quotidien' : 'Crédits'}
                    </Badge>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{mission.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <span className="font-mono-data text-[11px] flex-shrink-0" style={{ color: mission.completed ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {mission.progress}/{mission.target}
                    </span>
                  </div>
                </div>

                {/* Reward / Claim */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
                    <span className="font-mono-data text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>{mission.reward}</span>
                  </div>
                  <span className="text-[10px] font-mono-data" style={{ color: 'var(--accent)' }}>+{mission.xp} XP</span>
                  {mission.completed && !mission.claimed && (
                    <Button
                      size="sm"
                      onClick={() => handleClaim(mission.id)}
                      disabled={claiming === mission.id}
                      className="text-[10px] uppercase font-bold rounded-sm px-3 py-1 h-auto"
                      style={{ background: catColor, color: '#000' }}
                      data-testid={`claim-mission-${mission.id}`}
                    >
                      {claiming === mission.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Gift className="w-3 h-3 mr-1" /> Réclamer</>}
                    </Button>
                  )}
                  {mission.claimed && (
                    <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--accent)' }}>Réclamée</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {missions.length === 0 && (
        <Card className="border p-16 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <Target className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Aucune mission disponible</p>
        </Card>
      )}
    </div>
  );
}
