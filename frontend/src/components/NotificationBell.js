import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Trophy, Coins, Package, MessageCircle, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NOTIF_TYPES = {
  bet_won: { icon: Trophy, color: '#39FF14', label: 'Bet Won' },
  bet_lost: { icon: Coins, color: '#FF0055', label: 'Bet Lost' },
  badge_earned: { icon: Trophy, color: '#FFD700', label: 'Badge Earned' },
  pack_opened: { icon: Package, color: '#A855F7', label: 'Pack Opened' },
  comment_reply: { icon: MessageCircle, color: '#00F0FF', label: 'Reply' },
  trade_bought: { icon: Coins, color: '#FF8C00', label: 'Trade Sold' },
  level_up: { icon: Trophy, color: '#39FF14', label: 'Level Up' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatNotification(notif) {
  const d = notif.data || {};
  switch (notif.type) {
    case 'bet_won': return `You won ${d.amount_won} credits on ${d.match}!`;
    case 'bet_lost': return `Lost ${d.amount_lost} credits on ${d.match}`;
    case 'badge_earned': return `Badge unlocked: ${d.badge_name}!`;
    case 'pack_opened': return `Opened a pack and got ${d.player_name} (${d.rarity})`;
    case 'comment_reply': return `${d.username} replied to your comment`;
    case 'trade_bought': return `${d.buyer_name} bought your ${d.player_name} for ${d.price}`;
    case 'level_up': return `You reached ${d.new_level}!`;
    default: return d.message || 'New notification';
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 text-[10px] font-bold bg-[#FF0055] text-white rounded-full flex items-center justify-center" data-testid="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] rounded-xl border shadow-2xl overflow-hidden z-50 animate-fadeInUp" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="notification-dropdown">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllRead(); }}
                className="text-[10px] uppercase tracking-wider flex items-center gap-1 hover:opacity-80"
                style={{ color: 'var(--accent)' }}
                data-testid="mark-all-read"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[360px]">
            {notifications.length > 0 ? (
              notifications.slice(0, 20).map((n) => {
                const typeInfo = NOTIF_TYPES[n.type] || { icon: AlertCircle, color: '#888', label: 'Info' };
                const Icon = typeInfo.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markOneRead(n.id); }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left border-b transition-colors hover:opacity-90"
                    style={{ borderColor: 'var(--border-default)', background: n.read ? 'transparent' : 'color-mix(in srgb, var(--accent) 3%, transparent)' }}
                    data-testid={`notif-${n.id}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${typeInfo.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: typeInfo.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed" style={{ color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {formatNotification(n)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: 'var(--accent)' }} />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
