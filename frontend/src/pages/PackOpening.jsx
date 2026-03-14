import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Coins, Package, Sparkles, Star, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const RARITY_STYLES = {
  common: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', glow: '', label: 'Common' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', label: 'Rare' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]', label: 'Epic' },
  legendary: { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', text: 'text-[#FFD700]', glow: 'shadow-[0_0_30px_rgba(255,215,0,0.5)]', label: 'Legendary' },
};

const PACK_INFO = {
  bronze: { name: 'Bronze Pack', icon: '🟤', cards: 1, color: '#CD7F32', desc: '1 Player - Mostly commons' },
  silver: { name: 'Silver Pack', icon: '⚪', cards: 2, color: '#C0C0C0', desc: '2 Players - Better odds' },
  gold: { name: 'Gold Pack', icon: '🟡', cards: 3, color: '#FFD700', desc: '3 Players - Best chances' },
};

function PlayerRevealCard({ player, index, total, onDone }) {
  const [revealed, setRevealed] = useState(false);
  const style = RARITY_STYLES[player.rarity];

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 400 + index * 800);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (revealed && index === total - 1) {
      const timer = setTimeout(onDone, 1500);
      return () => clearTimeout(timer);
    }
  }, [revealed, index, total, onDone]);

  return (
    <div className={`transition-all duration-700 ${revealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0 rotate-y-180'}`}>
      <Card className={`${style.bg} ${style.border} border-2 ${style.glow} p-4 text-center transition-all duration-500 ${revealed ? 'animate-fadeInUp' : ''}`}>
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-black/40 border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: style.text.includes('FFD700') ? '#FFD700' : style.text.includes('purple') ? '#A855F7' : style.text.includes('blue') ? '#3B82F6' : '#666' }}>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name.replace(/\s/g, '')}`} alt="" className="w-16 h-16" />
        </div>
        <Badge className={`${style.bg} ${style.text} text-[10px] uppercase tracking-wider mb-2`}>{style.label}</Badge>
        <p className="text-white font-bold text-sm">{player.name}</p>
        <p className="text-gray-500 text-xs">{player.pos} - {player.nat}</p>
        <div className="mt-2 flex items-center justify-center gap-1">
          <Star className="w-3 h-3" style={{ color: style.text.includes('FFD700') ? '#FFD700' : style.text.includes('purple') ? '#A855F7' : style.text.includes('blue') ? '#3B82F6' : '#666' }} />
          <span className="font-mono-data text-lg font-bold text-white">{player.rating}</span>
        </div>
        {Object.keys(player.teams || {}).length > 0 && (
          <p className="text-[10px] text-gray-500 mt-1">Boosts: {Object.values(player.teams).map(b => `+${b}%`).join(', ')}</p>
        )}
      </Card>
    </div>
  );
}

export default function PackOpening() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState(null);
  const [opening, setOpening] = useState(false);
  const [openingType, setOpeningType] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    api.get('/packs').then(r => setPacks(r.data)).catch(() => {});
  }, []);

  const openPack = async (type) => {
    if (!user) return;
    const cost = packs[type].cost;
    if (user.virtual_credits < cost) {
      toast.error('Insufficient credits!');
      return;
    }
    setOpening(true);
    setOpeningType(type);
    setAllDone(false);
    try {
      const res = await api.post(`/packs/open/${type}`);
      setResults(res.data.players);
      setShowResults(true);
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to open pack');
      setOpening(false);
    }
  };

  const handleRevealDone = useCallback(() => {
    setAllDone(true);
  }, []);

  const closeResults = () => {
    setShowResults(false);
    setResults(null);
    setOpening(false);
    setOpeningType(null);
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8" data-testid="pack-opening-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Pack Store
          </h1>
          <p className="text-gray-500 text-sm mt-1">Open packs to collect players and boost your predictions</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] border border-white/5">
            <Coins className="w-4 h-4 text-[#FFD700]" />
            <span className="font-mono-data text-lg text-[#FFD700]" data-testid="pack-credits">{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Pack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {Object.entries(PACK_INFO).map(([type, info]) => {
          const pack = packs?.[type];
          const canAfford = user && pack && user.virtual_credits >= pack.cost;
          return (
            <Card
              key={type}
              className={`bg-[#121212] border-2 overflow-hidden transition-all duration-300 group cursor-pointer
                ${canAfford ? 'border-white/10 hover:border-[#39FF14]/30 hover:shadow-[0_0_30px_rgba(57,255,20,0.1)]' : 'border-white/5 opacity-60'}`}
              onClick={() => canAfford && !opening && openPack(type)}
              data-testid={`pack-${type}`}
            >
              <div className="p-6 text-center">
                {/* Pack visual */}
                <div className="relative w-28 h-36 mx-auto mb-4 rounded-xl border-2 flex items-center justify-center"
                     style={{ borderColor: info.color, background: `linear-gradient(135deg, ${info.color}10, ${info.color}05)` }}>
                  <Package className="w-12 h-12" style={{ color: info.color }} />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ backgroundColor: info.color }}>
                    {info.cards}
                  </div>
                  <Sparkles className="absolute top-2 left-2 w-4 h-4 opacity-50" style={{ color: info.color }} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {info.name}
                </h3>
                <p className="text-xs text-gray-500 mb-3">{info.desc}</p>
                {/* Probabilities */}
                {pack && (
                  <div className="grid grid-cols-4 gap-1 mb-4">
                    {Object.entries(pack.probs).map(([rarity, pct]) => (
                      <div key={rarity} className="text-center">
                        <p className={`text-[10px] ${RARITY_STYLES[rarity].text}`}>{RARITY_STYLES[rarity].label}</p>
                        <p className="font-mono-data text-[10px] text-gray-500">{pct}%</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-4 h-4" style={{ color: info.color }} />
                  <span className="font-mono-data text-xl font-bold" style={{ color: info.color }}>{pack?.cost}</span>
                </div>
              </div>
              <div className="h-1 transition-all duration-500" style={{ background: canAfford ? `linear-gradient(90deg, transparent, ${info.color}, transparent)` : 'transparent' }} />
            </Card>
          );
        })}
      </div>

      {/* Rarity Guide */}
      <Card className="bg-[#121212] border-white/5 p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Rarity Guide & Player Boosts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(RARITY_STYLES).map(([rarity, style]) => (
            <div key={rarity} className={`${style.bg} ${style.border} border rounded-lg p-3 text-center`}>
              <Badge className={`${style.bg} ${style.text} text-xs mb-2`}>{style.label}</Badge>
              <p className="text-xs text-gray-400">
                {rarity === 'common' && 'Rating 73-79 | +2-4% boost'}
                {rarity === 'rare' && 'Rating 80-85 | +6-7% boost'}
                {rarity === 'epic' && 'Rating 85-88 | +8-9% boost'}
                {rarity === 'legendary' && 'Rating 90-93 | +10-12% boost'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">
          Collected players boost your betting odds on matches involving their team. Current team = higher boost, former teams = lower boost. Max total boost: 25%
        </p>
      </Card>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={(v) => { if (allDone) closeResults(); }}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-lg" data-testid="pack-results-modal">
          <DialogTitle className="sr-only">Pack Results</DialogTitle>
          <div className="text-center space-y-4 py-2">
            <h2 className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: PACK_INFO[openingType]?.color }}>
              {PACK_INFO[openingType]?.name} Opened!
            </h2>
            <div className={`grid gap-4 ${results?.length === 1 ? 'grid-cols-1 max-w-[200px] mx-auto' : results?.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {results?.map((player, i) => (
                <PlayerRevealCard key={i} player={player} index={i} total={results.length} onDone={handleRevealDone} />
              ))}
            </div>
            {allDone && (
              <Button onClick={closeResults} className="bg-[#39FF14] text-black font-bold uppercase rounded-sm mt-4" data-testid="close-results-btn">
                Continue
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
