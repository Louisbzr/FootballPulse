import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collectionAPI, equipAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, Star, ShieldCheck, ShieldOff, Coins, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const RARITY_STYLES = {
  common: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Common', color: '#888' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Rare', color: '#3B82F6' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Epic', color: '#A855F7' },
  legendary: { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', text: 'text-[#FFD700]', label: 'Legendary', color: '#FFD700' },
};

const SELL_PRICES = { common: 10, rare: 30, epic: 75, legendary: 250 };

export default function Collection() {
  const { user, refreshUser } = useAuth();
  const [collection, setCollection] = useState([]);
  const [equippedId, setEquippedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('owned');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [colRes, eqRes] = await Promise.all([
        collectionAPI.list(),
        equipAPI.get(),
      ]);
      setCollection(colRes.data);
      setEquippedId(eqRes.data?.equipped?.id || null);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { if (user) loadData(); else setLoading(false); }, [user]);

  const handleEquip = async (playerId) => {
    setSubmitting(true);
    try {
      await equipAPI.equip(playerId);
      setEquippedId(playerId);
      toast.success('Joueur équipé !');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  const handleUnequip = async () => {
    setSubmitting(true);
    try {
      await equipAPI.unequip();
      setEquippedId(null);
      toast.success('Joueur déséquipé');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  const handleSell = async (playerId) => {
    setSubmitting(true);
    try {
      const res = await collectionAPI.sell(playerId);
      toast.success(`${res.data.sold} vendu pour ${res.data.credits_earned} crédits`);
      await refreshUser();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 text-center">
      <BookOpen className="w-12 h-12 text-[#39FF14] mx-auto mb-4" />
      <h1 className="text-3xl font-black text-white uppercase">Connectez-vous</h1>
    </div>
  );

  const owned = collection.filter(p => p.owned);
  const displayList = filter === 'owned' ? owned : collection;
  const equippedPlayer = collection.find(p => p.id === equippedId);

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8" data-testid="collection-page">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            <BookOpen className="w-8 h-8 inline mr-3 text-[#39FF14]" />
            Collection
          </h1>
          <p className="text-gray-500 text-sm">{owned.length} / {collection.length} joueurs collectés</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] border border-white/5">
          <Coins className="w-4 h-4 text-[#FFD700]" />
          <span className="font-mono-data text-lg text-[#FFD700]">{user.virtual_credits?.toLocaleString()}</span>
        </div>
      </div>

      {/* Equipped Player Banner */}
      {equippedPlayer && (
        <Card className="bg-gradient-to-r from-[#39FF14]/5 via-transparent to-[#39FF14]/5 border-[#39FF14]/20 p-4 mb-6 flex items-center gap-4" data-testid="equipped-banner">
          <div className="w-12 h-12 rounded-full border-2 border-[#39FF14] bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${equippedPlayer.name?.replace(/\s/g, '')}`} alt="" className="w-10 h-10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#39FF14]" />
              <span className="text-xs text-[#39FF14] font-bold uppercase tracking-wider">Joueur équipé</span>
            </div>
            <p className="text-white font-bold text-sm truncate">{equippedPlayer.name}</p>
            <p className="text-gray-500 text-xs">
              Boost: {Object.values(equippedPlayer.teams || {}).map(b => `+${b}%`).join(', ') || 'Aucun'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleUnequip} disabled={submitting}
            className="border-[#FF0055]/30 text-[#FF0055] hover:bg-[#FF0055]/10 rounded-sm shrink-0" data-testid="unequip-btn">
            <ShieldOff className="w-3 h-3 mr-1" /> Retirer
          </Button>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#121212] border border-white/5 mb-6 w-fit" data-testid="collection-filters">
        {[
          { value: 'owned', label: `Owned (${owned.length})` },
          { value: 'all', label: `All (${collection.length})` },
        ].map(f => (
          <Button key={f.value} size="sm" variant="ghost" onClick={() => setFilter(f.value)}
            className={`text-xs rounded-md ${filter === f.value ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-gray-400 hover:text-white'}`}
            data-testid={`filter-${f.value}`}>{f.label}</Button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-children" data-testid="collection-grid">
        {displayList.map(p => {
          const style = RARITY_STYLES[p.rarity] || RARITY_STYLES.common;
          const isEquipped = p.id === equippedId;
          const canSell = p.owned && p.count >= 2;
          return (
            <Card key={p.id} className={`${style.border} border overflow-hidden transition-all group ${
              p.owned ? 'bg-[#121212]' : 'bg-[#0A0A0A] opacity-40'
            } ${isEquipped ? 'ring-1 ring-[#39FF14]/50' : ''}`} data-testid={`player-card-${p.id}`}>
              <div className="p-3 text-center relative">
                {isEquipped && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#39FF14] flex items-center justify-center">
                    <ShieldCheck className="w-3 h-3 text-black" />
                  </div>
                )}
                <div className="w-14 h-14 mx-auto rounded-full border-2 flex items-center justify-center overflow-hidden mb-2"
                  style={{ borderColor: style.color, background: `linear-gradient(135deg, ${style.color}15, transparent)` }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name?.replace(/\s/g, '')}`} alt="" className="w-11 h-11" />
                </div>
                <Badge className={`${style.bg} ${style.text} text-[9px] mb-1`}>{style.label}</Badge>
                <p className="text-white text-xs font-bold truncate">{p.name}</p>
                <p className="text-gray-600 text-[10px]">{p.pos} - {p.nat}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3" style={{ color: style.color }} />
                  <span className="font-mono-data text-sm text-white">{p.rating}</span>
                </div>
                {p.owned && <p className="text-[10px] text-gray-500 mt-1">x{p.count}</p>}
                {p.current_team && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{p.current_team}</p>}

                {/* Action buttons */}
                {p.owned && (
                  <div className="mt-2 space-y-1.5">
                    {!isEquipped ? (
                      <Button size="sm" onClick={() => handleEquip(p.id)} disabled={submitting}
                        className="w-full bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 hover:bg-[#39FF14]/20 text-[10px] py-1 h-7 rounded-sm"
                        data-testid={`equip-${p.id}`}>
                        <ShieldCheck className="w-3 h-3 mr-1" /> Équiper
                      </Button>
                    ) : (
                      <Badge className="bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20 text-[10px] w-full justify-center py-1">
                        Équipé
                      </Badge>
                    )}
                    {canSell && (
                      <Button size="sm" variant="outline" onClick={() => handleSell(p.id)} disabled={submitting}
                        className="w-full border-[#FF0055]/20 text-[#FF0055] hover:bg-[#FF0055]/10 text-[10px] py-1 h-6 rounded-sm"
                        data-testid={`sell-${p.id}`}>
                        <Trash2 className="w-2.5 h-2.5 mr-1" /> Vendre ({SELL_PRICES[p.rarity]})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
