import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Mail, Lock, Loader2, ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // email | token | reset | done
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      if (res.data.token) {
        setResetToken(res.data.token);
        setStep('token');
        toast.success('Reset token generated!');
      } else {
        toast.info('If this email exists, a reset link would be sent.');
        setStep('token');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(token || resetToken, newPassword);
      toast.success('Password reset successfully!');
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Token copied!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20" data-testid="forgot-password-page">
      <Card className="w-full max-w-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent)' }}>
            <Lock className="w-7 h-7 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            {step === 'done' ? 'Password Reset!' : step === 'token' ? 'Reset Token' : step === 'reset' ? 'New Password' : 'Forgot Password'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="space-y-4" data-testid="forgot-form">
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                Enter your email to receive a reset token
              </p>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="you@example.com" required data-testid="forgot-email-input"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="forgot-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Reset'}
              </Button>
            </form>
          )}

          {step === 'token' && (
            <div className="space-y-4" data-testid="token-display">
              {resetToken ? (
                <>
                  <Badge className="rounded-sm text-xs w-full justify-center py-1" style={{ background: 'color-mix(in srgb, var(--accent-gold) 10%, transparent)', color: 'var(--accent-gold)' }}>
                    Demo Mode - Token shown here
                  </Badge>
                  <div className="p-3 rounded-lg border flex items-center gap-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
                    <code className="flex-1 text-xs break-all font-mono-data" style={{ color: 'var(--text-primary)' }}>{resetToken}</code>
                    <Button size="sm" variant="ghost" onClick={copyToken} data-testid="copy-token-btn">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                    </Button>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    In production, this token would be emailed to you. Token expires in 1 hour.
                  </p>
                </>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  If this email exists in our system, a reset link would be sent.
                </p>
              )}
              <Button onClick={() => setStep('reset')} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="proceed-reset-btn">
                Enter Reset Token
              </Button>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4" data-testid="reset-form">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Reset Token</Label>
                <Input
                  value={token || resetToken} onChange={e => setToken(e.target.value)}
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Paste your reset token" required data-testid="reset-token-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Min. 6 characters" required data-testid="reset-password-input"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="reset-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center" data-testid="reset-success">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                <Check className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Your password has been reset. You can now login.</p>
              <Link to="/login">
                <Button className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="go-to-login-btn">
                  Go to Login
                </Button>
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center mt-4">
            <Link to="/login" className="text-sm flex items-center gap-1 hover:underline" style={{ color: 'var(--text-muted)' }} data-testid="back-to-login">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
