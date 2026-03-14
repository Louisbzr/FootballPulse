import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { commentsAPI } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function CommentSection({ matchId, comments, onRefresh }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!user) { toast.error('Connectez-vous pour commenter'); return; }
    setLoading(true);
    try {
      await commentsAPI.create(matchId, { message: message.trim(), parent_id: replyTo });
      setMessage('');
      setReplyTo(null);
      onRefresh();
      toast.success('+5 XP pour votre commentaire !');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId) => {
    if (!user) { toast.error('Connectez-vous pour liker'); return; }
    try {
      await commentsAPI.like(commentId);
      onRefresh();
    } catch { /* ignore */ }
  };

  const topLevel = (comments || []).filter(c => !c.parent_id);
  const replies = (comments || []).filter(c => c.parent_id);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  };

  return (
    <div className="space-y-4" data-testid="comment-section">
      {/* Input */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2" data-testid="comment-form">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Réponse au commentaire</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-[#FF0055] hover:underline">Annuler</button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 border shrink-0" style={{ borderColor: 'var(--border-default)' }}>
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Partagez votre analyse..."
                className="min-h-[40px] max-h-[100px] text-sm resize-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                data-testid="comment-input"
              />
              <Button type="submit" size="sm" disabled={loading || !message.trim()} className="self-end" style={{ background: 'var(--accent)', color: '#000' }} data-testid="comment-submit">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        {topLevel.map((c) => (
          <div key={c.id} className="animate-fadeInUp" data-testid={`comment-${c.id}`}>
            <div className="flex gap-3">
              <Avatar className="w-7 h-7 border shrink-0 mt-0.5" style={{ borderColor: 'var(--border-default)' }}>
                <AvatarImage src={c.avatar} />
                <AvatarFallback className="text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{c.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.username}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button
                    onClick={() => handleLike(c.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      c.likes?.includes(user?.id) ? 'text-[#FF0055]' : 'text-gray-500 hover:text-[#FF0055]'
                    }`}
                    data-testid={`like-btn-${c.id}`}
                  >
                    <Heart className="w-3 h-3" fill={c.likes?.includes(user?.id) ? '#FF0055' : 'none'} />
                    {c.likes?.length || 0}
                  </button>
                  <button onClick={() => setReplyTo(c.id)} className="flex items-center gap-1 text-xs hover:text-[#00F0FF]" style={{ color: 'var(--text-muted)' }} data-testid={`reply-btn-${c.id}`}>
                    <MessageCircle className="w-3 h-3" /> Répondre
                  </button>
                </div>
                {/* Replies */}
                {replies.filter(r => r.parent_id === c.id).map((r) => (
                  <div key={r.id} className="flex gap-2 mt-2 ml-2 pl-3 border-l" style={{ borderColor: 'var(--border-default)' }}>
                    <Avatar className="w-5 h-5 border shrink-0 mt-0.5" style={{ borderColor: 'var(--border-default)' }}>
                      <AvatarImage src={r.avatar} />
                      <AvatarFallback className="text-[8px]" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{r.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.username}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {topLevel.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Aucun commentaire. Soyez le premier à analyser ce match !</p>
        )}
      </div>
    </div>
  );
}
