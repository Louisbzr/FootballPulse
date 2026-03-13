import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { betsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BET_TYPES = [
  { value: 'winner', label: 'Match Winner', odds: 1.8 },
  { value: 'exact_score', label: 'Exact Score', odds: 5.0 },
  { value: 'total_goals', label: 'Total Goals', odds: 2.5 },
];

export default function BetSlip({ match }) {
  const { user, refreshUser } = useAuth();
  const [betType, setBetType] = useState('winner');
  const [prediction, setPrediction] = useState('');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  if (!match) return null;

  const currentOdds = BET_TYPES.find(b => b.value === betType)?.odds || 1.8;
  const potentialWin = Math.round(amount * currentOdds);

  const handleBet = async () => {
    if (!user) { toast.error('Login to place a prediction'); return; }
    if (!prediction) { toast.error('Select a prediction'); return; }
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      await betsAPI.place({ match_id: match.id, bet_type: betType, prediction, amount: parseInt(amount) });
      toast.success(`Prediction placed! Potential win: ${potentialWin} credits`);
      refreshUser();
      setPrediction('');
      setAmount(100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place prediction');
    } finally {
      setLoading(false);
    }
  };

  if (match.status === 'finished') {
    return (
      <Card className="bg-[#121212] border-white/5 p-6 text-center" data-testid="bet-slip-closed">
        <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">This match is finished. Predictions are closed.</p>
      </Card>
    );
  }

  return (
    <Card className="bg-[#121212] border-white/5 p-5 space-y-5" data-testid="bet-slip">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Place Prediction</h3>
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#1E1E1E] border border-white/5">
            <Coins className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="font-mono-data text-xs text-[#FFD700]">{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Bet type */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Prediction Type</label>
        <div className="grid grid-cols-3 gap-2">
          {BET_TYPES.map(bt => (
            <button
              key={bt.value}
              onClick={() => { setBetType(bt.value); setPrediction(''); }}
              className={`p-3 rounded-lg border text-center transition-all ${
                betType === bt.value
                  ? 'border-[#39FF14]/30 bg-[#39FF14]/5'
                  : 'border-white/5 bg-[#0A0A0A] hover:border-white/10'
              }`}
              data-testid={`bet-type-${bt.value}`}
            >
              <p className="text-xs text-gray-400 mb-1">{bt.label}</p>
              <p className="font-mono-data text-sm text-[#39FF14]">x{bt.odds}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Prediction value */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Your Prediction</label>
        {betType === 'winner' ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'home', label: match.home_team?.short },
              { value: 'draw', label: 'Draw' },
              { value: 'away', label: match.away_team?.short },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPrediction(opt.value)}
                className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                  prediction === opt.value
                    ? 'border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]'
                    : 'border-white/5 bg-[#0A0A0A] text-gray-400 hover:border-white/10'
                }`}
                data-testid={`pred-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : betType === 'exact_score' ? (
          <Input
            placeholder="e.g., 2-1"
            value={prediction}
            onChange={e => setPrediction(e.target.value)}
            className="bg-[#0A0A0A] border-white/10 text-white font-mono-data"
            data-testid="pred-exact-score"
          />
        ) : (
          <Select value={prediction} onValueChange={setPrediction}>
            <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white" data-testid="pred-total-goals">
              <SelectValue placeholder="Select total goals" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-white/10">
              {['0', '1', '2', '3', '4', '5', '6+'].map(g => (
                <SelectItem key={g} value={g} className="text-white hover:bg-white/5 focus:bg-white/5">{g} goals</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Amount</label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="bg-[#0A0A0A] border-white/10 text-white font-mono-data"
            min="1"
            data-testid="bet-amount-input"
          />
          <div className="flex gap-1">
            {[50, 100, 250, 500].map(v => (
              <Button
                key={v}
                size="sm"
                variant="outline"
                onClick={() => setAmount(v)}
                className={`border-white/10 text-xs ${amount === v ? 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30' : 'text-gray-400'}`}
                data-testid={`amount-${v}`}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Odds</span>
          <span className="font-mono-data text-[#39FF14]">x{currentOdds}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Stake</span>
          <span className="font-mono-data text-white">{amount}</span>
        </div>
        <div className="border-t border-white/5 pt-2 flex justify-between">
          <span className="text-xs text-gray-400">Potential Win</span>
          <span className="font-mono-data text-sm font-bold text-[#39FF14]" data-testid="potential-win">{potentialWin}</span>
        </div>
      </div>

      <Button
        onClick={handleBet}
        disabled={loading || !prediction || amount <= 0}
        className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-wider hover:bg-[#39FF14]/90 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] transition-all rounded-sm py-5"
        data-testid="place-bet-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Place Prediction</span>
        )}
      </Button>
    </Card>
  );
}
