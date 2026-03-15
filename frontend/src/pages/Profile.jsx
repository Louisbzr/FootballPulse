import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authAPI, matchesAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Save, Loader2, Zap, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', favorite_team: '' });
  const [pwdForm, setPwdForm] = useState({ current: '', new_pwd: '' });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({ username: user.username || '', favorite_team: user.favorite_team || '' });
    
    // Remplacer teamsAPI.list() par les équipes des matchs
    matchesAPI.list().then(r => {
      const seen = new Set();
      const uniqueTeams = [];
      r.data.forEach(m => {
        if (!seen.has(m.home_team.id)) { seen.add(m.home_team.id); uniqueTeams.push(m.home_team); }
        if (!seen.has(m.away_team.id)) { seen.add(m.away_team.id); uniqueTeams.push(m.away_team); }
      });
      uniqueTeams.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(uniqueTeams);
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateProfile({ username: form.username, favorite_team: form.favorite_team || null });
      await refreshUser();
      toast.success('Profil mis à jour !');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Échec de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_pwd.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setPwdLoading(true);
    try {
      await authAPI.changePassword(pwdForm.current, pwdForm.new_pwd);
      toast.success('Mot de passe modifié !');
      setPwdForm({ current: '', new_pwd: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8" data-testid="profile-page">
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
        Profil
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
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>E-mail</Label>
              <Input value={user.email} disabled className="opacity-60" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur</Label>
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                data-testid="profile-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Équipe favorite</Label>
              <Select value={form.favorite_team} onValueChange={v => setForm({ ...form, favorite_team: v })}>
                <SelectTrigger style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="profile-team-select">
                  <SelectValue placeholder="Choisir une équipe" />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.name} style={{ color: 'var(--text-primary)' }}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="font-bold uppercase tracking-wider rounded-sm" style={{ background: 'var(--accent)', color: '#000' }} data-testid="profile-save-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Sauvegarder</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          Infos du compte
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Crédits</p>
            <p className="font-mono-data text-lg" style={{ color: 'var(--accent-gold)' }}>{user.virtual_credits?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Membre depuis</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
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

      {/* Change Password */}
      <Card className="border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
          <Lock className="w-4 h-4 inline mr-2" /> Changer le mot de passe
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4" data-testid="change-password-form">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Mot de passe actuel</Label>
            <Input type="password" value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })}
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              required data-testid="current-password-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Nouveau mot de passe</Label>
            <Input type="password" value={pwdForm.new_pwd} onChange={e => setPwdForm({ ...pwdForm, new_pwd: e.target.value })}
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Min. 6 caractères" required data-testid="new-password-input" />
          </div>
          <Button type="submit" disabled={pwdLoading} variant="outline" className="rounded-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} data-testid="change-password-btn">
            {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Changer le mot de passe</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}
