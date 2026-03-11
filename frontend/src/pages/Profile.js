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
    if (!user) { navigate('/login'); return; }
    setForm({ username: user.username || '', favorite_team: user.favorite_team || '' });
    teamsAPI.list().then(r => setTeams(r.data)).catch(() => {});
  }, [user, navigate]);

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
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        Profile
      </h1>

      {/* Profile Card */}
      <Card className="bg-[#121212] border-white/5 mb-6">
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <Avatar className="w-16 h-16 border-2 border-[#39FF14]/20">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-[#1E1E1E] text-[#39FF14] text-xl">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-bold text-white">{user.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-[#39FF14]/10 text-[#39FF14] text-xs rounded-sm"><Zap className="w-3 h-3 mr-1" />{user.level}</Badge>
              <span className="text-xs text-gray-500 font-mono-data">{user.xp} XP</span>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="profile-form">
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
              <Input value={user.email} disabled className="bg-black/30 border-white/5 text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Username</Label>
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="bg-black/50 border-white/10 text-white"
                data-testid="profile-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Favorite Team</Label>
              <Select value={form.favorite_team} onValueChange={v => setForm({ ...form, favorite_team: v })}>
                <SelectTrigger className="bg-black/50 border-white/10 text-white" data-testid="profile-team-select">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-[#121212] border-white/10">
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.name} className="text-white hover:bg-white/5 focus:bg-white/5">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="bg-[#39FF14] text-black font-bold uppercase tracking-wider hover:bg-[#39FF14]/90 rounded-sm" data-testid="profile-save-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="bg-[#121212] border-white/5 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Account Info
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Credits</p>
            <p className="font-mono-data text-lg text-[#FFD700]">{user.virtual_credits?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Member Since</p>
            <p className="text-sm text-gray-300">{new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Badges</p>
            <p className="font-mono-data text-lg text-white">{user.badges?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Level</p>
            <p className="text-sm text-[#39FF14] font-medium">{user.level}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
