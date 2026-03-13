import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { betsAPI, oddsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, TrendingUp, TrendingDown, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const BET_TYPES = [
  { value: 'winner', label: 'Vainqueur', icon: '\u26BD' },
  { value: 'exact_score', label: 'Score exact', icon: '\uD83C\uDFAF' },
  { value: 'first_scorer', label: '1er buteur', icon: '\u2B50' },
  { value: 'total_goals', label: 'Total buts', icon: '#' },
  { value: 'both_teams_score', label: 'Les 2 marquent', icon: '\u2194' },
  { value: 'over_under', label: 'Over/Under', icon: '\u2195' },
];

export default function BetSlip({ match }) {
  const { user, refreshUser } = useAuth();
  const [betType, setBetType] = useState('winner');
  const [prediction, setPrediction] = useState('');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [boostData, setBoostData] = useState(null);
  const [dynamicOdds, setDynamicOdds] = useState(null);

  useEffect(() => {
    if (match) {
      oddsAPI.get(match.id).then(r => setDynamicOdds(r.data)).catch(() => {});
      if (user) {
        api.get(`/boosts/${match.id}`).then(r => setBoostData(r.data)).catch(() => {});
      }
    }
  }, [user, match]);

  // Refresh odds every 30s for live matches
  useEffect(() => {
    if (match?.status !== 'live') return;
    const interval = setInterval(() => {
      oddsAPI.get(match.id).then(r => setDynamicOdds(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [match?.id, match?.status]);

  if (!match) return null;

  const getOdds = (bt) => {
    if (dynamicOdds?.odds?.[bt]) return dynamicOdds.odds[bt];
    return { base: 1.8, current: 1.8 };
  };
  const currentBetOdds = getOdds(betType);
  const isLive = match?.status === 'live';
  const oddsChanged = currentBetOdds.base !== currentBetOdds.current;
  const totalBoost = boostData?.total_boost || 0;
  const finalOdds = Math.round(currentBetOdds.current * (1 + totalBoost / 100) * 100) / 100;
  const potentialWin = Math.round(amount * finalOdds);

  const handleBet = async () => {
    if (!user) { toast.error('Connectez-vous pour parier'); return; }
    if (!prediction) { toast.error('Choisissez une prédiction'); return; }
    if (amount <= 0) { toast.error('Montant invalide'); return; }
    setLoading(true);
    try {
      await betsAPI.place({ match_id: match.id, bet_type: betType, prediction, amount: parseInt(amount) });
      toast.success(`Pari placé ! Gain potentiel: ${potentialWin} crédits`);
      refreshUser();
      setPrediction('');
      setAmount(100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (match.status === 'finished') {
    return (
      <Card className="border p-6 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="bet-slip-closed">
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Match terminé. Les paris sont fermés.</p>
      </Card>
    );
  }

  return (
    <Card className="border p-5 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="bet-slip">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Placer un pari</h3>
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <Coins className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-mono-data text-xs" style={{ color: 'var(--accent-gold)' }}>{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Bet type grid */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Type de pari</label>
        <div className="grid grid-cols-3 gap-2">
          {BET_TYPES.map(bt => {
            const o = getOdds(bt.value);
            const changed = o.base !== o.current;
            const dropped = o.current < o.base;
            return (
              <button
                key={bt.value}
                onClick={() => { setBetType(bt.value); setPrediction(''); }}
                className="p-2.5 rounded-lg border text-center transition-all"
                style={{
                  borderColor: betType === bt.value ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)',
                  background: betType === bt.value ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'var(--bg-input)',
                }}
                data-testid={`bet-type-${bt.value}`}
              >
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{bt.label}</p>
                <div className="flex items-center justify-center gap-1">
                  {changed && (
                    <span className="text-[9px] text-gray-600 line-through font-mono-data">x{o.base}</span>
                  )}
                  <span className={`font-mono-data text-sm ${changed ? (dropped ? 'text-[#FF0055]' : 'text-[#39FF14]') : 'text-[#39FF14]'}`}>
                    x{o.current}
                  </span>
                  {changed && dropped && <TrendingDown className="w-3 h-3 text-[#FF0055]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prediction value based on bet type */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Votre prédiction</label>
        {betType === 'winner' ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'home', label: match.home_team?.short },
              { value: 'draw', label: 'Nul' },
              { value: 'away', label: match.away_team?.short },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPrediction(opt.value)}
                className="p-3 rounded-lg border text-center text-sm font-medium transition-all"
                style={{
                  borderColor: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)',
                  background: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-input)',
                  color: prediction === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                data-testid={`pred-${opt.value}`}>{opt.label}</button>
            ))}
          </div>
        ) : betType === 'exact_score' ? (
          <Input placeholder="ex: 2-1" value={prediction} onChange={e => setPrediction(e.target.value)}
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            className="font-mono-data" data-testid="pred-exact-score" />
        ) : betType === 'first_scorer' ? (
          <Input placeholder="Nom du joueur (ex: Mbappé)" value={prediction} onChange={e => setPrediction(e.target.value)}
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            data-testid="pred-first-scorer" />
        ) : betType === 'total_goals' ? (
          <Select value={prediction} onValueChange={setPrediction}>
            <SelectTrigger style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="pred-total-goals">
              <SelectValue placeholder="Total de buts" />
            </SelectTrigger>
            <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              {['0', '1', '2', '3', '4', '5', '6+'].map(g => (
                <SelectItem key={g} value={g} style={{ color: 'var(--text-primary)' }}>{g} buts</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : betType === 'both_teams_score' ? (
          <div className="grid grid-cols-2 gap-2">
            {[{ value: 'yes', label: 'Oui' }, { value: 'no', label: 'Non' }].map(opt => (
              <button key={opt.value} onClick={() => setPrediction(opt.value)}
                className="p-3 rounded-lg border text-center text-sm font-medium transition-all"
                style={{
                  borderColor: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)',
                  background: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-input)',
                  color: prediction === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                data-testid={`pred-bts-${opt.value}`}>{opt.label}</button>
            ))}
          </div>
        ) : betType === 'over_under' ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'over_1.5', label: 'Over 1.5' }, { value: 'under_1.5', label: 'Under 1.5' },
              { value: 'over_2.5', label: 'Over 2.5' }, { value: 'under_2.5', label: 'Under 2.5' },
              { value: 'over_3.5', label: 'Over 3.5' }, { value: 'under_3.5', label: 'Under 3.5' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPrediction(opt.value)}
                className="p-2 rounded-lg border text-center text-xs font-medium transition-all"
                style={{
                  borderColor: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)',
                  background: prediction === opt.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-input)',
                  color: prediction === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                data-testid={`pred-ou-${opt.value}`}>{opt.label}</button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Mise</label>
        <div className="flex gap-2">
          <Input type="number" value={amount} onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            className="font-mono-data" min="1" data-testid="bet-amount-input" />
          <div className="flex gap-1">
            {[50, 100, 250, 500].map(v => (
              <Button key={v} size="sm" variant="outline" onClick={() => setAmount(v)}
                className="text-xs"
                style={{
                  borderColor: amount === v ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)',
                  color: amount === v ? 'var(--accent)' : 'var(--text-secondary)',
                  background: amount === v ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                }}
                data-testid={`amount-${v}`}>{v}</Button>
            ))}
          </div>
        </div>
      </div>

      {/* Equipped player boost */}
      {boostData && boostData.total_boost > 0 && (
        <div className="bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-lg p-3 space-y-2" data-testid="bet-boosts">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#39FF14]" />
            <span className="text-xs text-[#39FF14] font-bold uppercase tracking-wider">Boost joueur équipé</span>
            <span className="font-mono-data text-xs text-[#39FF14] ml-auto">+{boostData.total_boost}%</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {boostData.active_boosts?.map((b, i) => (
              <span key={i} className="text-[10px] bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded-full font-mono-data">
                {b.player} +{b.boost}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border rounded-lg p-4 space-y-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Cote de base</span>
          <span className="font-mono-data" style={{ color: 'var(--text-primary)' }}>x{currentBetOdds.base}</span>
        </div>
        {oddsChanged && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-pulse" />}
              Cote live ({dynamicOdds?.score?.home}-{dynamicOdds?.score?.away}, {dynamicOdds?.elapsed}')
            </span>
            <span className={`font-mono-data ${currentBetOdds.current < currentBetOdds.base ? 'text-[#FF0055]' : 'text-[#39FF14]'}`}>
              x{currentBetOdds.current}
            </span>
          </div>
        )}
        {totalBoost > 0 && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Boost joueur</span>
            <span className="font-mono-data text-[#39FF14]">+{totalBoost}%</span>
          </div>
        )}
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Cote finale</span>
          <span className="font-mono-data text-[#39FF14]">x{finalOdds}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Mise</span>
          <span className="font-mono-data" style={{ color: 'var(--text-primary)' }}>{amount}</span>
        </div>
        <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gain potentiel</span>
          <span className="font-mono-data text-sm font-bold text-[#39FF14]" data-testid="potential-win">{potentialWin}</span>
        </div>
      </div>

      <Button onClick={handleBet} disabled={loading || !prediction || amount <= 0}
        className="w-full font-bold uppercase tracking-wider hover:opacity-90 hover:shadow-lg transition-all rounded-sm py-5"
        style={{ background: 'var(--accent)', color: '#000' }}
        data-testid="place-bet-btn">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Placer le pari</span>
        )}
      </Button>
    </Card>
  );
}
