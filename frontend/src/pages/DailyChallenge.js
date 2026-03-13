import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { challengeAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Gift, Clock, CheckCircle, XCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

const RARITY_STYLES = {
  common: { text: 'text-gray-400', label: 'Common' },
  rare: { text: 'text-blue-400', label: 'Rare' },
  epic: { text: 'text-purple-400', label: 'Epic' },
  legendary: { text: 'text-[#FFD700]', label: 'Legendary' },
  icon: { text: 'text-[#FF8C00]', label: 'ICON' },
};

export default function DailyChallenge() {
  const { user, refreshUser } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    challengeAPI.get().then(r => setChallenge(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const submitPrediction = async (prediction) => {
    setSubmitting(true);
    try {
      await challengeAPI.predict(prediction);
      toast.success('Prédiction soumise !');
      const updated = await challengeAPI.get();
      setChallenge(updated.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
    setSubmitting(false);
  };

  const checkResult = async () => {
    setSubmitting(true);
    try {
      const res = await challengeAPI.check();
      setResult(res.data);
      if (res.data.result === 'won') {
        await refreshUser();
      }
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
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 text-center" data-testid="challenge-login-prompt">
      <Zap className="w-12 h-12 text-[#39FF14] mx-auto mb-4" />
      <h1 className="text-3xl font-black uppercase" style={{ color: 'var(--text-primary)', fontFamily: 'Barlow Condensed, sans-serif' }}>Connectez-vous</h1>
      <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Connectez-vous pour participer au défi quotidien</p>
    </div>
  );

  const isCompleted = challenge?.status === 'completed';
  const isPredicted = challenge?.status === 'predicted';
  const isActive = challenge?.active && challenge?.status === 'active';

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8" data-testid="daily-challenge-page">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF0055]/10 border border-[#FF0055]/20 mb-4">
          <Gift className="w-4 h-4 text-[#FF0055]" />
          <span className="text-sm font-bold text-[#FF0055] uppercase tracking-wider">Pack Luck</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          Défi Quotidien
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Devinez le résultat et gagnez un joueur gratuit !</p>
      </div>

      {!challenge?.active ? (
        <Card className="border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="no-challenge">
          <Clock className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Aucun match disponible pour le défi</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Revenez demain ou synchronisez les matchs</p>
        </Card>
      ) : (
        <Card className="border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="challenge-card">
          {/* Match Header */}
          <div className="bg-gradient-to-r from-[#FF0055]/5 via-transparent to-[#00F0FF]/5 p-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-[10px] uppercase tracking-widest text-center mb-4" style={{ color: 'var(--text-muted)' }}>Match du jour</p>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                {challenge.match?.home_team?.logo && (
                  <img src={challenge.match.home_team.logo} alt="" className="w-14 h-14 mx-auto mb-2 rounded-lg bg-black/30 p-2" />
                )}
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{challenge.match?.home_team?.short || 'HOME'}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{challenge.match?.home_team?.name}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-600 font-mono-data">VS</p>
                <p className="text-[10px] text-gray-600 mt-1">
                  {challenge.match?.league}
                </p>
              </div>
              <div className="text-center">
                {challenge.match?.away_team?.logo && (
                  <img src={challenge.match.away_team.logo} alt="" className="w-14 h-14 mx-auto mb-2 rounded-lg bg-black/30 p-2" />
                )}
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{challenge.match?.away_team?.short || 'AWAY'}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{challenge.match?.away_team?.name}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isActive && !result && (
              <div data-testid="prediction-options">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Qui va gagner ?</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'home', label: challenge.match?.home_team?.short || 'DOM', color: '#39FF14' },
                    { value: 'draw', label: 'NUL', color: '#FFD700' },
                    { value: 'away', label: challenge.match?.away_team?.short || 'EXT', color: '#00F0FF' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      onClick={() => submitPrediction(opt.value)}
                      disabled={submitting}
                      className="h-16 rounded-lg border-2 transition-all hover:scale-105"
                      style={{
                        backgroundColor: `${opt.color}10`,
                        borderColor: `${opt.color}30`,
                        color: opt.color,
                      }}
                      data-testid={`predict-${opt.value}`}
                    >
                      <div>
                        <p className="text-lg font-bold">{opt.label}</p>
                        <p className="text-[10px] opacity-60">
                          {opt.value === 'home' ? 'Victoire dom.' : opt.value === 'away' ? 'Victoire ext.' : 'Match nul'}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isPredicted && !result && (
              <div className="text-center space-y-4" data-testid="prediction-submitted">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20">
                  <CheckCircle className="w-4 h-4 text-[#39FF14]" />
                  <span className="text-sm text-[#39FF14] font-bold">
                    Prédiction : {challenge.prediction === 'home' ? challenge.match?.home_team?.short : challenge.prediction === 'away' ? challenge.match?.away_team?.short : 'NUL'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Le résultat sera disponible une fois le match terminé</p>
                <Button
                  onClick={checkResult}
                  disabled={submitting}
                  variant="outline" className="rounded-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                  data-testid="check-result-btn"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  Vérifier le résultat
                </Button>
              </div>
            )}

            {isCompleted && !result && (
              <div className="text-center" data-testid="challenge-completed">
                <Badge className={`text-sm px-4 py-2 ${challenge.result === 'won' ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'bg-[#FF0055]/10 text-[#FF0055]'}`}>
                  {challenge.result === 'won' ? 'Gagné !' : 'Perdu'}
                </Badge>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Revenez demain pour un nouveau défi</p>
              </div>
            )}

            {result && (
              <div className="text-center space-y-4" data-testid="challenge-result">
                {result.result === 'won' ? (
                  <>
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#39FF14]/10 flex items-center justify-center animate-bounce">
                      <Gift className="w-8 h-8 text-[#39FF14]" />
                    </div>
                    <p className="text-xl font-bold text-[#39FF14]">Bravo !</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{result.message}</p>
                    {result.player && (
                      <div className="inline-block p-4 rounded-xl border mt-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${result.player.name?.replace(/\s/g, '')}`} alt="" className="w-16 h-16 mx-auto rounded-full mb-2" />
                        <Badge className={`${RARITY_STYLES[result.player.rarity]?.text || 'text-gray-400'} bg-white/5 text-xs`}>
                          {RARITY_STYLES[result.player.rarity]?.label}
                        </Badge>
                        <p className="font-bold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{result.player.name}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-[#FFD700]" />
                          <span className="font-mono-data text-sm" style={{ color: 'var(--text-primary)' }}>{result.player.rating}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : result.status === 'waiting' ? (
                  <>
                    <Clock className="w-10 h-10 text-[#FFD700] mx-auto" />
                    <p className="text-[#FFD700] font-bold">Match pas encore terminé</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.message}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-[#FF0055] mx-auto" />
                    <p className="text-xl font-bold text-[#FF0055]">Raté !</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{result.message}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reward info */}
          <div className="p-4 border-t" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#FF0055]" />
                <span>1 joueur gratuit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#39FF14]" />
                <span>+15 XP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Reset chaque jour</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
