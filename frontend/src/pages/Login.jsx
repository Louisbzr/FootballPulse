import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20" data-testid="login-page">
      <div className="absolute inset-0 bg-gradient-to-b from-[#39FF14]/3 to-transparent pointer-events-none" />
      <Card className="w-full max-w-md bg-[#121212] border-white/5 relative">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded bg-[#39FF14] flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Welcome Back
          </CardTitle>
          <p className="text-sm text-gray-500">Sign in to your MatchPulse account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-400 text-xs uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600"
                  placeholder="you@example.com"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-400 text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600"
                  placeholder="Your password"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-wider hover:bg-[#39FF14]/90 rounded-sm py-5" data-testid="login-submit-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#39FF14] hover:underline" data-testid="login-register-link">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
