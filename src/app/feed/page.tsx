'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Inbox, MapPin, RefreshCw, UserPlus, X } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { AnnouncementCard, type AnnouncementItem } from '@/components/announcement-card';
import { apiGet } from '@/lib/client/api';
import { clearBadge } from '@/lib/client/push-client';
import { getLocalUser, setLocalUser, type LocalUser } from '@/lib/client/storage';

export default function FeedPage() {
  const router = useRouter();
  const [local, setLocal] = useState<LocalUser | null>(null);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMemberNudge, setShowMemberNudge] = useState(false);

  const load = useCallback(async (user: LocalUser) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (user.city) params.set('city', user.city);
      if (user.district) params.set('district', user.district);
      const res = await apiGet<{ items: AnnouncementItem[] }>(
        `/api/announcements?${params.toString()}`,
      );
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getLocalUser();
    if (!user?.userId) {
      router.replace('/');
      return;
    }
    setLocal(user);
    setShowMemberNudge(!user.email && !user.membershipPromptDismissed);
    void load(user);
    // Akışı görüntüledi → uygulama ikonundaki okunmamış rozetini temizle
    void clearBadge();
  }, [router, load]);

  function dismissNudge() {
    setShowMemberNudge(false);
    setLocalUser({ membershipPromptDismissed: true });
  }

  const showEnableBanner = local && local.notificationsEnabled !== true;

  return (
    <>
      <AppHeader />
      <main className="container max-w-md py-5">
        {local && (
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <MapPin className="h-4 w-4" />
              {local.city || 'Bölge seçilmedi'}
              {local.district ? ` · ${local.district}` : ''}
            </Link>
            <button
              onClick={() => local && load(local)}
              aria-label="Yenile"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </button>
          </div>
        )}

        {showEnableBanner && (
          <Link
            href="/setup"
            className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bell className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Bildirimleri açın</p>
              <p className="text-sm text-muted-foreground">
                Yeni duyurularda anında haberdar olun.
              </p>
            </div>
          </Link>
        )}

        {showMemberNudge && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Üyeliğinizi oluşturun</p>
              <p className="text-sm text-muted-foreground">
                Üye olun; başka cihazdan giriş yapın, şifrenizi unutursanız e-postayla sıfırlayın.
                İsteğe bağlı.
              </p>
              <Link href="/uye-ol" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                Üye ol →
              </Link>
            </div>
            <button
              aria-label="Kapat"
              onClick={dismissNudge}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <h1 className="mb-3 text-xl font-bold">Son duyurular</h1>

        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Henüz duyuru yok</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bölgenizde yeni bir duyuru olduğunda burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <AnnouncementCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
