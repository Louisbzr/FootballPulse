import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authAPI, teamsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Save, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', favorite_team: '' });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({ username: user.username || '', favorite_team: user.favorite_team || '' });
    teamsAPI.list().then(r => setTeams(r.data)).catch(() => {});
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateProfile({ username: form.username, favorite_team: form.favorite_team || null });
      await refreshUser();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8" data-testid="profile-page">
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
        Profile
      </h1>

      {/* Profile Card */}
      <Card className="border mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="p-6 flex items-center gap-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <Avatar className="w-16 h-16 border-2" style={{ borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xl" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-xs rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}><Zap className="w-3 h-3 mr-1" />{user.level}</Badge>
              <span className="text-xs font-mono-data" style={{ color: 'var(--text-muted)' }}>{user.xp} XP</span>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="profile-form">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</Label>
              <Input value={user.email} disabled className="opacity-60" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Username</Label>
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                data-testid="profile-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Favorite Team</Label>
              <Select value={form.favorite_team} onValueChange={v => setForm({ ...form, favorite_team: v })}>
                <SelectTrigger style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="profile-team-select">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.name} style={{ color: 'var(--text-primary)' }}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="font-bold uppercase tracking-wider rounded-sm" style={{ background: 'var(--accent)', color: '#000' }} data-testid="profile-save-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          Account Info
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Credits</p>
            <p className="font-mono-data text-lg" style={{ color: 'var(--accent-gold)' }}>{user.virtual_credits?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Member Since</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Badges</p>
            <p className="font-mono-data text-lg" style={{ color: 'var(--text-primary)' }}>{user.badges?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Level</p>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{user.level}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
