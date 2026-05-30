'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginMember } from '@/lib/client/account';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginMember(email.trim(), password);
      // Kimlik ve abonelik artık bu hesapta. Feed bölgeyi yükler; bildirim
      // kapalıysa orada "Bildirimleri açın" çıkar.
      router.replace('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.');
      setLoading(false);
    }
  }

  return (
    <main className="container flex min-h-screen max-w-sm flex-col justify-center py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Megaphone className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold">Giriş yap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Üye hesabınızla giriş yapın; bölgeniz ve aboneliğiniz bu cihaza taşınır.
        </p>
      </div>

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
        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="text-right">
            <Link href="/sifremi-unuttum" className="text-sm font-medium text-primary hover:underline">
              Şifremi unuttum?
            </Link>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Üye değil misiniz?{' '}
        <Link href="/" className="font-medium text-primary hover:underline">
          Bölge seçerek başlayın
        </Link>
      </p>
      <Link
        href="/"
        className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ana sayfaya dön
      </Link>
    </main>
  );
}
