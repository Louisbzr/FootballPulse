import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, User, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success('Account created! You received 1,000 credits.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20" data-testid="register-page">
      <Card className="w-full max-w-md relative" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent)' }}>
            <Zap className="w-7 h-7 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Join MatchPulse
          </CardTitle>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create your account and get 1,000 free credits</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input id="username" type="text" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Choose a username" required data-testid="register-username-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input id="email" type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="you@example.com" required data-testid="register-email-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input id="password" type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Min. 6 characters" required data-testid="register-password-input" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="register-submit-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="hover:underline" style={{ color: 'var(--accent)' }} data-testid="register-login-link">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
