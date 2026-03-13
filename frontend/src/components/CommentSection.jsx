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
    if (!user) { toast.error('Login to comment'); return; }
    setLoading(true);
    try {
      await commentsAPI.create(matchId, { message: message.trim(), parent_id: replyTo });
      setMessage('');
      setReplyTo(null);
      onRefresh();
      toast.success('+5 XP for commenting!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error posting comment');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId) => {
    if (!user) { toast.error('Login to like'); return; }
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
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-4" data-testid="comment-section">
      {/* Input */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2" data-testid="comment-form">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Replying to comment</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-[#FF0055] hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 border border-white/10 shrink-0">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-xs">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your analysis..."
                className="min-h-[40px] max-h-[100px] bg-[#0A0A0A] border-white/10 text-white placeholder:text-gray-600 text-sm resize-none"
                data-testid="comment-input"
              />
              <Button type="submit" size="sm" disabled={loading || !message.trim()} className="bg-[#39FF14] text-black hover:bg-[#39FF14]/90 self-end" data-testid="comment-submit">
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
              <Avatar className="w-7 h-7 border border-white/10 shrink-0 mt-0.5">
                <AvatarImage src={c.avatar} />
                <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-[10px]">{c.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{c.username}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{c.message}</p>
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
                  <button onClick={() => setReplyTo(c.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#00F0FF]" data-testid={`reply-btn-${c.id}`}>
                    <MessageCircle className="w-3 h-3" /> Reply
                  </button>
                </div>
                {/* Replies */}
                {replies.filter(r => r.parent_id === c.id).map((r) => (
                  <div key={r.id} className="flex gap-2 mt-2 ml-2 pl-3 border-l border-white/5">
                    <Avatar className="w-5 h-5 border border-white/10 shrink-0 mt-0.5">
                      <AvatarImage src={r.avatar} />
                      <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-[8px]">{r.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">{r.username}</span>
                        <span className="text-[10px] text-gray-600">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-400">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {topLevel.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">No comments yet. Be the first to analyze this match!</p>
        )}
      </div>
    </div>
  );
}
