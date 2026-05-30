'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowLeft, MapPin, ShieldCheck, KeyRound, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerMember } from '@/lib/client/account';
import { getLocalUser } from '@/lib/client/storage';

export default function RegisterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState<{ city?: string; district?: string | null }>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = getLocalUser();
    if (!local?.userId) {
      // Üyelik bölge seçiminden sonra gelir; kimlik yoksa ana sayfaya yönlendir.
      router.replace('/');
      return;
    }
    if (local.email) {
      // Zaten üye → ayarlara
      router.replace('/settings');
      return;
    }
    setRegion({ city: local.city, district: local.district });
    setReady(true);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mail = email.trim();
    if (!mail) {
      setError('E-posta girin.');
      return;
    }
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
      await registerMember(mail, password);
      router.replace('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üyelik oluşturulamadı.');
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="container max-w-md py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UserPlus className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold">Üye olun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          İsteğe bağlı. Bölge seçiminiz ve aboneliğiniz korunur; üyelik ek güvence sağlar.
        </p>
      </div>

      <ul className="mb-6 space-y-3">
        {[
          { icon: Smartphone, text: 'Başka bir cihazdan giriş yapıp aynı bölgenize ulaşırsınız.' },
          { icon: KeyRound, text: 'Şifrenizi unutursanız e-postayla sıfırlarsınız.' },
          { icon: ShieldCheck, text: 'Cihazınız değişse bile bilgileriniz kaybolmaz.' },
        ].map((f, i) => {
          const Icon = f.icon;
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm">{f.text}</span>
            </li>
          );
        })}
      </ul>

      {region.city && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Bölgeniz: <strong className="text-foreground">{region.city}</strong>
          {region.district ? ` · ${region.district}` : ''}
        </div>
      )}

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
            placeholder="ornek@eposta.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
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
          <Label htmlFor="confirm">Şifre (tekrar)</Label>
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
          {loading ? 'Oluşturuluyor…' : 'Üyeliği Tamamla'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Zaten üye misiniz?{' '}
        <Link href="/giris" className="font-medium text-primary hover:underline">
          Giriş yapın
        </Link>
      </p>
      <Link
        href="/feed"
        className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Şimdilik geç
      </Link>
    </main>
  );
}
