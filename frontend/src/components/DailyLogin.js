import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Flame, Gift } from 'lucide-react';
import api from '@/lib/api';

export default function DailyLogin() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [reward, setReward] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/daily-status').then(r => {
      setStatus(r.data);
      if (!r.data.claimed_today) setOpen(true);
    }).catch(() => {});
  }, [user]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await api.post('/daily-claim');
      setReward(res.data);
      await refreshUser();
    } catch { /* already claimed */ }
    setClaiming(false);
  };

  if (!user || !status) return null;

  const streakMilestones = [
    { day: 1, mult: 'x1', active: true },
    { day: 3, mult: 'x1.5', active: (status.streak || 0) >= 3 },
    { day: 7, mult: 'x2', active: (status.streak || 0) >= 7 },
    { day: 30, mult: 'x3', active: (status.streak || 0) >= 30 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border max-w-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="daily-login-modal">
        <DialogTitle className="sr-only">Daily Login Bonus</DialogTitle>
        <div className="text-center space-y-4 py-2">
          {!reward ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center mx-auto animate-pulse-neon">
                <Gift className="w-8 h-8 text-[#FFD700]" />
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Daily Bonus
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-[#FF0055]" />
                <span className="font-mono-data text-sm">
                  Streak: <span className="text-[#FF0055] font-bold">{status.streak || 0}</span> days
                </span>
              </div>
              {/* Streak milestones */}
              <div className="flex justify-center gap-2 py-2">
                {streakMilestones.map(m => (
                  <div key={m.day} className={`px-3 py-2 rounded-lg border text-center`}
                    style={{ borderColor: m.active ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-default)', background: m.active ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'var(--bg-input)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Day {m.day}+</p>
                    <p className={`font-mono-data text-sm font-bold`} style={{ color: m.active ? 'var(--accent)' : 'var(--text-muted)' }}>{m.mult}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4 border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Today's Reward</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5 text-[#FFD700]" />
                  <span className="font-mono-data text-2xl font-bold text-[#FFD700]">+{status.next_reward}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>20 base x{status.multiplier}</p>
              </div>
              <Button
                onClick={handleClaim}
                disabled={claiming || status.claimed_today}
                className="w-full font-bold uppercase tracking-wider rounded-sm py-5"
                style={{ background: 'var(--accent-gold)', color: '#000' }}
                data-testid="claim-daily-btn"
              >
                {status.claimed_today ? 'Already Claimed' : claiming ? 'Claiming...' : 'Claim Bonus'}
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#39FF14]/10 flex items-center justify-center mx-auto">
                <Coins className="w-8 h-8 text-[#39FF14]" />
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-[#39FF14]" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                +{reward.reward} Credits!
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-[#FF0055]" />
                <span className="font-mono-data text-sm text-[#FF0055]">{reward.streak} day streak!</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total: <span className="font-mono-data" style={{ color: 'var(--accent-gold)' }}>{reward.total_credits}</span> credits</p>
              <Button onClick={() => setOpen(false)} className="w-full font-bold uppercase rounded-sm" style={{ background: 'var(--accent)', color: '#000' }} data-testid="close-daily-btn">
                Let's Go!
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
