'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCircle2, Smartphone, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosInstallSheet } from '@/components/ios-install-sheet';
import { enablePush } from '@/lib/client/push-client';
import { isIOS, isStandalone, pushSupported, notificationPermission } from '@/lib/client/platform';
import { getLocalUser, setLocalUser } from '@/lib/client/storage';

type Status = 'idle' | 'enabling' | 'done' | 'denied' | 'error' | 'unsupported';

export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Cihaz/ortam bilgileri
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const local = getLocalUser();
    if (!local?.userId) {
      router.replace('/');
      return;
    }
    setUserId(local.userId);

    const ios = isIOS();
    const standalone = isStandalone();
    const canPush = pushSupported();

    if (ios && !standalone) {
      // iOS Safari/Chrome/Edge içinde, henüz ana ekrana eklenmemiş
      setIosNeedsInstall(true);
      setSheetOpen(true);
    } else if (!canPush) {
      setSupported(false);
      setStatus('unsupported');
    } else if (notificationPermission() === 'granted') {
      // İzin zaten verilmiş → sessizce kaydı tazele
      void handleEnable(local.userId);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleEnable(id?: string) {
    const uid = id ?? userId;
    if (!uid) return;
    setStatus('enabling');
    setMessage('');
    const res = await enablePush(uid);
    if (res.ok) {
      setLocalUser({ notificationsEnabled: true });
      setStatus('done');
    } else if (res.reason === 'denied') {
      setStatus('denied');
      setMessage(res.message);
    } else if (res.reason === 'unsupported') {
      setStatus('unsupported');
      setSupported(false);
    } else {
      setStatus('error');
      setMessage(res.message);
    }
  }

  if (!ready) return null;

  return (
    <main className="container max-w-md py-8">
      {status === 'done' ? (
        <div className="py-10 text-center">
          <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </span>
          <h1 className="text-2xl font-bold">Hazırsınız</h1>
          <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
            Bölgenizde yeni bir duyuru olduğunda size bildirim göndereceğiz.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => router.push('/feed')}>
            Duyuruları Gör
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Bell className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-bold leading-tight">Bildirimleri açın</h1>
            <p className="mt-2 text-muted-foreground">
              Son adım: duyuru geldiğinde haberdar olmak için bildirimlere izin verin.
            </p>
          </div>

          {iosNeedsInstall ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Smartphone className="h-5 w-5 text-primary" />
                  iPhone / iPad için bir adım daha
                </div>
                <p className="text-sm text-muted-foreground">
                  Bildirim alabilmek için Susma’yı önce ana ekranınıza eklemelisiniz. Adımları
                  görmek için aşağıdaki butona dokunun.
                </p>
                <Button className="mt-4 w-full" size="lg" onClick={() => setSheetOpen(true)}>
                  Nasıl eklerim?
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Ana ekrana ekledikten sonra, oradaki <strong>Susma</strong> simgesinden açıp bu
                adımı tamamlayın.
              </p>
            </div>
          ) : !supported ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Info className="h-5 w-5 text-primary" />
                Bu cihazda bildirim desteklenmiyor
              </div>
              <p className="text-sm text-muted-foreground">
                Tarayıcınız anlık bildirimleri desteklemiyor olabilir. Yine de duyuruları web
                akışından takip edebilirsiniz.
              </p>
              <button
                onClick={() => router.push('/feed')}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Duyuruları görüntüle
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleEnable()}
                disabled={status === 'enabling'}
              >
                {status === 'enabling' ? 'İzin isteniyor…' : 'Bildirimleri Aç'}
              </Button>

              {status === 'denied' && (
                <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium">Bildirim izni kapalı.</p>
                  <p className="mt-1 text-muted-foreground">
                    Tarayıcı ayarlarından bu site için bildirimlere izin verip tekrar deneyebilirsiniz.
                  </p>
                </div>
              )}
              {status === 'error' && (
                <p className="mt-4 text-sm font-medium text-destructive">{message}</p>
              )}
            </div>
          )}
        </>
      )}

      <IosInstallSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </main>
  );
}
