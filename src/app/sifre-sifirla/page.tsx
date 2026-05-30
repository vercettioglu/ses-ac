'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/client/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Token'ı URL'den oku (useSearchParams Suspense gereksinimi olmadan).
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/account/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.replace('/giris'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.');
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="container flex min-h-screen max-w-sm flex-col justify-center py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold">Yeni şifre belirleyin</h1>
      </div>

      {done ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="font-semibold">Şifreniz güncellendi</p>
          <p className="mt-1 text-sm text-muted-foreground">Giriş ekranına yönlendiriliyorsunuz…</p>
        </div>
      ) : !token ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="font-semibold">Geçersiz bağlantı</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sıfırlama bağlantısı eksik veya hatalı. Lütfen yeniden isteyin.
          </p>
          <Link
            href="/sifremi-unuttum"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Yeni bağlantı iste
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="password">Yeni şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Yeni şifre (tekrar)</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
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
