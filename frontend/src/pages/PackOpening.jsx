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
  common: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', glow: '', label: 'Commun', color: '#888' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]', label: 'Rare', color: '#3B82F6' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]', label: 'Épique', color: '#A855F7' },
  legendary: { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', text: 'text-[#FFD700]', glow: 'shadow-[0_0_40px_rgba(255,215,0,0.6)]', label: 'Légendaire', color: '#FFD700' },
  icon: { bg: 'bg-[#FF8C00]/10', border: 'border-[#FF8C00]/40', text: 'text-[#FF8C00]', glow: 'shadow-[0_0_50px_rgba(255,140,0,0.8)]', label: 'ICÔNE', color: '#FF8C00' },
};

const PACK_INFO = {
  bronze: { name: 'Pack Bronze', cards: 1, color: '#CD7F32', desc: '1 Joueur - Surtout des communs' },
  silver: { name: 'Pack Argent', cards: 2, color: '#C0C0C0', desc: '2 Joueurs - Meilleures chances' },
  gold: { name: 'Pack Or', cards: 3, color: '#FFD700', desc: '3 Joueurs - Meilleures probabilités' },
};

function PlayerRevealCard({ player, index, total, onDone }) {
  const [phase, setPhase] = useState('hidden'); // hidden -> glow -> reveal
  const style = RARITY_STYLES[player.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('glow'), 300 + index * 900);
    const t2 = setTimeout(() => setPhase('reveal'), 700 + index * 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index]);

  useEffect(() => {
    if (phase === 'reveal' && index === total - 1) {
      const t = setTimeout(onDone, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, index, total, onDone]);

  return (
    <div className="relative">
      {/* Glow ring effect */}
      {phase === 'glow' && (
        <div className="absolute inset-0 rounded-xl animate-ping opacity-30" style={{ backgroundColor: style.color, animationDuration: '0.6s', animationIterationCount: '1' }} />
      )}
      <Card
        className={`relative overflow-hidden transition-all duration-700 ease-out ${
          phase === 'hidden' ? 'scale-50 opacity-0 rotate-12' :
          phase === 'glow' ? 'scale-110 opacity-80' :
          'scale-100 opacity-100'
        } ${phase === 'reveal' ? style.glow : ''} ${style.border} border-2 p-4 text-center`}
        style={{
          background: phase === 'reveal'
            ? `radial-gradient(ellipse at center, ${style.color}12 0%, #0A0A0A 70%)`
            : phase === 'glow' ? `radial-gradient(circle, ${style.color}25 0%, #0A0A0A 60%)` : '#121212',
        }}
      >
        {/* Sparkle particles for icon/legendary/epic */}
        {(player.rarity === 'icon' || player.rarity === 'legendary' || player.rarity === 'epic') && phase === 'reveal' && (
          <>
            <div className="absolute top-2 left-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: style.color, animationDelay: '0.1s' }} />
            <div className="absolute top-4 right-4 w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: style.color, animationDelay: '0.3s' }} />
            <div className="absolute bottom-3 left-5 w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: style.color, animationDelay: '0.5s' }} />
            <div className="absolute bottom-5 right-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: style.color, animationDelay: '0.2s' }} />
          </>
        )}
        <div
          className="w-20 h-20 mx-auto mb-3 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all duration-500"
          style={{
            borderColor: style.color,
            background: `linear-gradient(135deg, ${style.color}20, transparent)`,
            boxShadow: phase === 'reveal' && player.rarity !== 'common' ? `0 0 20px ${style.color}40` : 'none',
          }}
        >
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name.replace(/\s/g, '')}`}
            alt=""
            className={`w-16 h-16 transition-all duration-500 ${phase === 'reveal' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          />
        </div>
        <Badge
          className={`${style.bg} ${style.text} text-[10px] uppercase tracking-wider mb-2 transition-all duration-300 ${
            phase === 'reveal' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {style.label}
        </Badge>
        <p className={`text-white font-bold text-sm transition-all duration-500 ${phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {player.name}
        </p>
        <p className={`text-gray-500 text-xs transition-all duration-500 delay-100 ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}>
          {player.pos} - {player.nat}
        </p>
        <div className={`mt-2 flex items-center justify-center gap-1 transition-all duration-500 delay-200 ${phase === 'reveal' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <Star className="w-3.5 h-3.5" style={{ color: style.color }} />
          <span className="font-mono-data text-xl font-bold text-white">{player.rating}</span>
        </div>
        {Object.keys(player.teams || {}).length > 0 && (
          <p className={`text-[10px] text-gray-500 mt-1 transition-all duration-500 delay-300 ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}>
            Boosts: {Object.values(player.teams).map(b => `+${b}%`).join(', ')}
          </p>
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
  const [packPhase, setPackPhase] = useState('idle'); // idle -> shaking -> opening -> done

  useEffect(() => {
    api.get('/packs').then(r => setPacks(r.data)).catch(() => {});
  }, []);

  const openPack = async (type) => {
    if (!user) return;
    const cost = packs[type].cost;
    if (user.virtual_credits < cost) {
      toast.error('Crédits insuffisants !');
      return;
    }
    setOpening(true);
    setOpeningType(type);
    setAllDone(false);
    setPackPhase('shaking');
    try {
      const res = await api.post(`/packs/open/${type}`);
      // Let shaking play for a beat
      setTimeout(() => {
        setPackPhase('opening');
        setTimeout(() => {
          setResults(res.data.players);
          setShowResults(true);
          setPackPhase('done');
        }, 600);
      }, 800);
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
      setOpening(false);
      setPackPhase('idle');
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
    setPackPhase('idle');
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8" data-testid="pack-opening-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Boutique Packs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ouvrez des packs pour collectionner des joueurs et booster vos pronostics</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
            <Coins className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-mono-data text-lg" style={{ color: 'var(--accent-gold)' }} data-testid="pack-credits">{user.virtual_credits?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Pack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {Object.entries(PACK_INFO).map(([type, info]) => {
          const pack = packs?.[type];
          const canAfford = user && pack && user.virtual_credits >= pack.cost;
          const isOpening = opening && openingType === type;
          return (
            <Card
              key={type}
              className={`border-2 overflow-hidden transition-all duration-300 group
                ${isOpening && packPhase === 'shaking' ? 'animate-[shake_0.15s_ease-in-out_infinite]' : ''}
                ${canAfford && !opening ? 'hover:shadow-lg cursor-pointer' : ''}
                ${!canAfford && !isOpening ? 'opacity-60' : ''}`}
              style={{
                background: 'var(--bg-card)',
                borderColor: canAfford && !opening ? 'var(--border-hover)' : 'var(--border-default)',
              }}
              onClick={() => canAfford && !opening && openPack(type)}
              data-testid={`pack-${type}`}
            >
              <div className="p-6 text-center">
                {/* Pack visual */}
                <div
                  className={`relative w-28 h-36 mx-auto mb-4 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                    isOpening && packPhase === 'opening' ? 'scale-125 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  style={{ borderColor: info.color, background: `linear-gradient(135deg, ${info.color}15, ${info.color}05)` }}
                >
                  <Package className="w-12 h-12 transition-transform group-hover:scale-110" style={{ color: info.color }} />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ backgroundColor: info.color }}>
                    {info.cards}
                  </div>
                  <Sparkles className="absolute top-2 left-2 w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: info.color }} />
                  {isOpening && (
                    <div className="absolute inset-0 rounded-xl" style={{ background: `radial-gradient(circle, ${info.color}30 0%, transparent 70%)` }} />
                  )}
                </div>
                <h3 className="text-lg font-bold uppercase tracking-wider mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
                  {info.name}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{info.desc}</p>
                {/* Probabilities */}
                {pack && (
                  <div className="grid grid-cols-4 gap-1 mb-4">
                    {Object.entries(pack.probs).map(([rarity, pct]) => (
                      <div key={rarity} className="text-center">
                        <p className={`text-[10px] ${RARITY_STYLES[rarity].text}`}>{RARITY_STYLES[rarity].label}</p>
                        <p className="font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}%</p>
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

      {/* Quick Links */}
      <div className="flex gap-3 mb-8">
        <Button variant="outline" className="rounded-sm text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }} onClick={() => navigate('/collection')} data-testid="go-to-collection">
          Voir la collection
        </Button>
        <Button variant="outline" className="rounded-sm text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }} onClick={() => navigate('/trading')} data-testid="go-to-trading">
          Marché d'échange
        </Button>
      </div>

      {/* Rarity Guide */}
      <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          Guide des raretés & Boosts joueurs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(RARITY_STYLES).map(([rarity, style]) => (
            <div key={rarity} className={`${style.bg} ${style.border} border rounded-lg p-3 text-center`}>
              <Badge className={`${style.bg} ${style.text} text-xs mb-2`}>{style.label}</Badge>
              <p className="text-xs text-gray-400">
                {rarity === 'common' && 'Note 73-79 | +2-4% boost'}
                {rarity === 'rare' && 'Note 80-85 | +6-7% boost'}
                {rarity === 'epic' && 'Note 85-88 | +8-9% boost'}
                {rarity === 'legendary' && 'Note 90-93 | +10-12% boost'}
                {rarity === 'icon' && 'Note 96-98 | +12-15% boost'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">
          Les joueurs collectés boostent vos cotes sur les matchs impliquant leur équipe. Boost total max : 25%
        </p>
      </Card>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={(v) => { if (allDone) closeResults(); }}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-lg" data-testid="pack-results-modal">
          <DialogTitle className="sr-only">Résultats du pack</DialogTitle>
          <div className="text-center space-y-4 py-2">
            <h2 className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: PACK_INFO[openingType]?.color }}>
              {PACK_INFO[openingType]?.name} ouvert !
            </h2>
            <div className={`grid gap-4 ${results?.length === 1 ? 'grid-cols-1 max-w-[200px] mx-auto' : results?.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {results?.map((player, i) => (
                <PlayerRevealCard key={i} player={player} index={i} total={results.length} onDone={handleRevealDone} />
              ))}
            </div>
            {allDone && (
              <Button onClick={closeResults} className="bg-[#39FF14] text-black font-bold uppercase rounded-sm mt-4 hover:bg-[#39FF14]/90 transition-all hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]" data-testid="close-results-btn">
                Continuer
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shake animation keyframe injected via style tag */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
