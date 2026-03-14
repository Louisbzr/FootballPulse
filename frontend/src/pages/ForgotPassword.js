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
        toast.success('Jeton de réinitialisation généré !');
      } else {
        toast.info('Si cet e-mail existe, un lien de réinitialisation serait envoyé.');
        setStep('token');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(token || resetToken, newPassword);
      toast.success('Mot de passe réinitialisé avec succès !');
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Jeton copié !');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20" data-testid="forgot-password-page">
      <Card className="w-full max-w-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent)' }}>
            <Lock className="w-7 h-7 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            {step === 'done' ? 'Mot de passe réinitialisé !' : step === 'token' ? 'Jeton de réinitialisation' : step === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe oublié'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="space-y-4" data-testid="forgot-form">
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                Entrez votre e-mail pour recevoir un jeton de réinitialisation
              </p>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>E-mail</Label>
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Demander la réinitialisation'}
              </Button>
            </form>
          )}

          {step === 'token' && (
            <div className="space-y-4" data-testid="token-display">
              {resetToken ? (
                <>
                  <Badge className="rounded-sm text-xs w-full justify-center py-1" style={{ background: 'color-mix(in srgb, var(--accent-gold) 10%, transparent)', color: 'var(--accent-gold)' }}>
                    Mode démo - Jeton affiché ici
                  </Badge>
                  <div className="p-3 rounded-lg border flex items-center gap-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
                    <code className="flex-1 text-xs break-all font-mono-data" style={{ color: 'var(--text-primary)' }}>{resetToken}</code>
                    <Button size="sm" variant="ghost" onClick={copyToken} data-testid="copy-token-btn">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                    </Button>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    En production, ce jeton serait envoyé par e-mail. Le jeton expire dans 1 heure.
                  </p>
                </>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  Si cet e-mail existe dans notre système, un lien de réinitialisation serait envoyé.
                </p>
              )}
              <Button onClick={() => setStep('reset')} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="proceed-reset-btn">
                Entrer le jeton
              </Button>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4" data-testid="reset-form">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Jeton de réinitialisation</Label>
                <Input
                  value={token || resetToken} onChange={e => setToken(e.target.value)}
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Collez votre jeton" required data-testid="reset-token-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="pl-10" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Min. 6 caractères" required data-testid="reset-password-input"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="reset-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center" data-testid="reset-success">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                <Check className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.</p>
              <Link to="/login">
                <Button className="w-full font-bold uppercase tracking-wider rounded-sm py-5" style={{ background: 'var(--accent)', color: '#000' }} data-testid="go-to-login-btn">
                  Aller à la connexion
                </Button>
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center mt-4">
            <Link to="/login" className="text-sm flex items-center gap-1 hover:underline" style={{ color: 'var(--text-muted)' }} data-testid="back-to-login">
              <ArrowLeft className="w-3 h-3" /> Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
