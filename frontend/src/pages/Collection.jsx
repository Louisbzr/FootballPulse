import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, User, Coins, ShieldCheck, ArrowDownUp, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const RARITY_STYLES = {
  common: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', glow: '', label: 'Common', color: '#666' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]', label: 'Rare', color: '#3B82F6' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]', label: 'Epic', color: '#A855F7' },
  legendary: { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/20', text: 'text-[#FFD700]', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.3)]', label: 'Legendary', color: '#FFD700' },
};

const SELL_PRICES = { common: 10, rare: 30, epic: 75, legendary: 250 };

export default function Collection() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    if (!user) return;
    loadCollection();
  }, [user]);

  const loadCollection = () => {
    api.get('/collection').then(r => { setCollection(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  const sellDuplicate = async (playerId, playerName) => {
    try {
      const res = await api.post(`/collection/sell/${playerId}`);
      toast.success(`Sold ${playerName} for ${res.data.credits_earned} credits`);
      await refreshUser();
      loadCollection();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot sell');
    }
  };

  const setAsAvatar = async (playerId) => {
    try {
      await api.post(`/avatar/player/${playerId}`);
      toast.success('Avatar updated!');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  let filtered = collection;
  if (rarityFilter !== 'all') filtered = filtered.filter(p => p.rarity === rarityFilter);
  if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'rarity') {
    const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
    filtered.sort((a, b) => order[a.rarity] - order[b.rarity]);
  } else if (sortBy === 'owned') filtered.sort((a, b) => (b.owned ? 1 : 0) - (a.owned ? 1 : 0));

  const owned = collection.filter(p => p.owned).length;
  const total = collection.length;
  const uniqueRarities = { legendary: 0, epic: 0, rare: 0, common: 0 };
  collection.filter(p => p.owned).forEach(p => { uniqueRarities[p.rarity]++; });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" /></div>;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="collection-page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Collection
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-[#39FF14] font-mono-data">{owned}</span> / {total} players collected
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(uniqueRarities).map(([r, c]) => c > 0 && (
            <Badge key={r} className={`${RARITY_STYLES[r].bg} ${RARITY_STYLES[r].text} text-[10px]`}>
              {c} {RARITY_STYLES[r].label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6" data-testid="collection-filters">
        <div className="flex gap-1 p-1 rounded-lg bg-[#121212] border border-white/5">
          {['all', 'legendary', 'epic', 'rare', 'common'].map(r => (
            <Button key={r} size="sm" variant="ghost" onClick={() => setRarityFilter(r)}
              className={`text-xs rounded-md capitalize ${rarityFilter === r ? (r === 'all' ? 'bg-[#39FF14]/10 text-[#39FF14]' : `${RARITY_STYLES[r]?.bg} ${RARITY_STYLES[r]?.text}`) : 'text-gray-400 hover:text-white'}`}
              data-testid={`filter-${r}`}>
              {r === 'all' ? 'All' : RARITY_STYLES[r]?.label}
            </Button>
          ))}
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] bg-[#121212] border-white/5 text-gray-400 text-xs">
            <ArrowDownUp className="w-3 h-3 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#121212] border-white/10">
            <SelectItem value="rating" className="text-white text-xs">By Rating</SelectItem>
            <SelectItem value="rarity" className="text-white text-xs">By Rarity</SelectItem>
            <SelectItem value="owned" className="text-white text-xs">Owned First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-children">
        {filtered.map(player => {
          const style = RARITY_STYLES[player.rarity];
          return (
            <Card
              key={player.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                player.owned
                  ? `${style.bg} ${style.border} border ${style.glow} hover:scale-[1.02]`
                  : 'bg-[#0A0A0A] border-white/5 opacity-30 grayscale'
              }`}
              data-testid={`player-card-${player.id}`}
            >
              <div className="p-3 text-center">
                {/* Duplicate count */}
                {player.count > 1 && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#39FF14] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-black">x{player.count}</span>
                  </div>
                )}
                {/* Avatar */}
                <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-black/40 border flex items-center justify-center overflow-hidden"
                     style={{ borderColor: player.owned ? style.color : '#333' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name.replace(/\s/g, '')}`} alt="" className="w-10 h-10" />
                </div>
                {/* Info */}
                <Badge className={`${style.bg} ${style.text} text-[8px] uppercase tracking-wider mb-1`}>{style.label}</Badge>
                <p className="text-xs font-bold text-white truncate">{player.name}</p>
                <p className="text-[10px] text-gray-500">{player.pos} - {player.nat}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3" style={{ color: style.color }} />
                  <span className="font-mono-data text-sm font-bold text-white">{player.rating}</span>
                </div>
                {/* Boosts */}
                {player.owned && Object.keys(player.teams || {}).length > 0 && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {Object.entries(player.teams).map(([tid, boost]) => (
                      <span key={tid} className="text-[8px] font-mono-data text-[#39FF14] bg-[#39FF14]/5 px-1 rounded">+{boost}%</span>
                    ))}
                  </div>
                )}
                {/* Actions */}
                {player.owned && (
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" className="flex-1 text-[10px] h-6 text-gray-400 hover:text-[#39FF14]" onClick={() => setAsAvatar(player.id)} data-testid={`set-avatar-${player.id}`}>
                      <User className="w-3 h-3 mr-0.5" /> Avatar
                    </Button>
                    {player.count > 1 && (
                      <Button size="sm" variant="ghost" className="flex-1 text-[10px] h-6 text-gray-400 hover:text-[#FFD700]" onClick={() => sellDuplicate(player.id, player.name)} data-testid={`sell-${player.id}`}>
                        <Coins className="w-3 h-3 mr-0.5" /> {SELL_PRICES[player.rarity]}
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
