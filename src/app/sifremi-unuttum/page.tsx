'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/client/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost('/api/account/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container flex min-h-screen max-w-sm flex-col justify-center py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold">Şifremi unuttum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hesabınızın e-postasını girin; sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="font-semibold">E-postanızı kontrol edin</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu e-posta bir hesaba bağlıysa, sıfırlama bağlantısını gönderdik. Bağlantı 1 saat
            geçerlidir. Gelmediyse spam klasörünü kontrol edin.
          </p>
          <Link
            href="/giris"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Giriş ekranına dön
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
          </Button>
        </form>
      )}

      <Link
        href="/giris"
        className="mx-auto mt-5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Girişe dön
      </Link>
    </main>
  );
}
