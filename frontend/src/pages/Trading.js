import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { tradesAPI, collectionAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Coins, ArrowRightLeft, Loader2, Star, ShoppingCart, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const RARITY_STYLES = {
  common: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Common' },
  rare: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Rare' },
  epic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Epic' },
  legendary: { bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', text: 'text-[#FFD700]', label: 'Legendary' },
  icon: { bg: 'bg-[#FF8C00]/10', border: 'border-[#FF8C00]/40', text: 'text-[#FF8C00]', label: 'ICON' },
};

export default function Trading() {
  const { user, refreshUser } = useAuth();
  const [trades, setTrades] = useState([]);
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [askingPrice, setAskingPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [t, c] = await Promise.all([
        tradesAPI.list(),
        user ? collectionAPI.list() : Promise.resolve({ data: [] }),
      ]);
      setTrades(t.data);
      setCollection(c.data?.filter(p => p.owned && p.count >= 2) || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleCreateTrade = async () => {
    if (!selectedPlayer || !askingPrice) return;
    const price = parseInt(askingPrice);
    if (isNaN(price) || price < 10 || price > 5000) {
      toast.error('Le prix doit être entre 10 et 5000');
      return;
    }
    setSubmitting(true);
    try {
      await tradesAPI.create({ player_id: selectedPlayer.id, asking_price: price });
      toast.success('Offre créée !');
      setShowSellModal(false);
      setSelectedPlayer(null);
      setAskingPrice('');
      await refreshUser();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  const handleBuy = async (trade) => {
    if (!user) return toast.error('Connectez-vous d\'abord');
    setSubmitting(true);
    try {
      await tradesAPI.buy(trade.id);
      toast.success(`${trade.player_name} acheté !`);
      await refreshUser();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  const handleCancel = async (trade) => {
    setSubmitting(true);
    try {
      await tradesAPI.cancel(trade.id);
      toast.success('Offre annulée');
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

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8" data-testid="trading-page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            <ArrowRightLeft className="w-8 h-8 inline mr-3" style={{ color: 'var(--accent-secondary)' }} />
            Trading
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Échangez vos doublons avec d'autres joueurs</p>
        </div>
        <div className="flex gap-2">
          {user && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <Coins className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                <span className="font-mono-data text-lg" style={{ color: 'var(--accent-gold)' }} data-testid="trading-credits">{user.virtual_credits?.toLocaleString()}</span>
              </div>
              <Button
                onClick={() => setShowSellModal(true)}
                className="font-bold uppercase rounded-sm hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#000' }}
                disabled={collection.length === 0}
                data-testid="create-trade-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Vendre
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Open Trades */}
      {trades.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children" data-testid="trades-list">
          {trades.map(trade => {
            const style = RARITY_STYLES[trade.player_rarity] || RARITY_STYLES.common;
            const isOwn = user?.id === trade.seller_id;
            return (
              <Card key={trade.id} className={`border ${style.border} overflow-hidden transition-all hover:border-opacity-60`} style={{ background: 'var(--bg-card)' }} data-testid={`trade-${trade.id}`}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-black/40 border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: style.text.includes('FFD700') ? '#FFD700' : style.text.includes('purple') ? '#A855F7' : style.text.includes('blue') ? '#3B82F6' : '#666' }}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${trade.player_name?.replace(/\s/g, '')}`} alt="" className="w-10 h-10" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{trade.player_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`${style.bg} ${style.text} text-[10px]`}>{style.label}</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" style={{ color: 'var(--accent-gold)' }} />
                          <span className="font-mono-data text-xs" style={{ color: 'var(--text-primary)' }}>{trade.player_rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <div>
                      <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Vendeur</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{trade.seller_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#FFD700]" />
                      <span className="font-mono-data text-lg font-bold text-[#FFD700]">{trade.asking_price}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    {isOwn ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-[#FF0055]/30 text-[#FF0055] hover:bg-[#FF0055]/10 rounded-sm"
                        onClick={() => handleCancel(trade)}
                        disabled={submitting}
                        data-testid={`cancel-trade-${trade.id}`}
                      >
                        <X className="w-3 h-3 mr-1" /> Annuler
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 border border-[#00F0FF]/30 rounded-sm"
                        onClick={() => handleBuy(trade)}
                        disabled={submitting || !user || (user && user.virtual_credits < trade.asking_price)}
                        data-testid={`buy-trade-${trade.id}`}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" /> Acheter
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border p-16 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="no-trades">
          <ArrowRightLeft className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Aucune offre sur le marché</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Soyez le premier à vendre un joueur !</p>
        </Card>
      )}

      {/* Create Trade Modal */}
      <Dialog open={showSellModal} onOpenChange={setShowSellModal}>
        <DialogContent className="border max-w-md" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="create-trade-modal">
          <DialogTitle className="text-lg font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Mettre en vente
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: 'var(--text-muted)' }}>Choisissez un doublon et fixez votre prix</DialogDescription>
          <div className="space-y-4 mt-2">
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {collection.map(p => {
                const style = RARITY_STYLES[p.rarity] || RARITY_STYLES.common;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedPlayer?.id === p.id ? '' : ''
                    }`}
                    style={{ borderColor: selectedPlayer?.id === p.id ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--border-default)', background: selectedPlayer?.id === p.id ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent' }}
                    data-testid={`sell-option-${p.id}`}
                  >
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name?.replace(/\s/g, '')}`} alt="" className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`${style.bg} ${style.text} text-[9px]`}>{style.label}</Badge>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>x{p.count}</span>
                      </div>
                    </div>
                    <span className="font-mono-data text-sm" style={{ color: 'var(--text-primary)' }}>{p.rating}</span>
                  </div>
                );
              })}
            </div>
            {selectedPlayer && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Prix demandé</label>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#FFD700]" />
                  <Input
                    type="number"
                    min={10}
                    max={5000}
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="10 - 5000"
                    className="border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    data-testid="asking-price-input"
                  />
                </div>
              </div>
            )}
            <Button
              onClick={handleCreateTrade}
              disabled={!selectedPlayer || !askingPrice || submitting}
              className="w-full font-bold uppercase rounded-sm"
              style={{ background: 'var(--accent)', color: '#000' }}
              data-testid="confirm-trade-btn"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer la vente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
