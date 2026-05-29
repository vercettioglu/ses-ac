'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/client/api';
import type { Role } from '@prisma/client';

function redirectFor(context: 'admin' | 'panel', role: Role): string {
  if (context === 'panel') return '/panel';
  return role === 'SENDER' ? '/panel' : '/admin';
}

export function LoginForm({
  title,
  subtitle,
  context,
}: {
  title: string;
  subtitle: string;
  context: 'admin' | 'panel';
}) {
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
      const res = await apiPost<{ role: Role; name: string }>('/api/auth/login', {
        email,
        password,
      });
      router.replace(redirectFor(context, res.role));
      router.refresh();
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
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
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
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Button>
      </form>
    </main>
  );
}
