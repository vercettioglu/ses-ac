'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, Bell, MapPin, ShieldCheck, Smartphone, ArrowRight, Compass, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegionFields, type RegionValue } from '@/components/region-fields';
import { IosInstallSheet } from '@/components/ios-install-sheet';
import { apiPost } from '@/lib/client/api';
import { getLocalUser, setLocalUser } from '@/lib/client/storage';
import { recoverFromDevice } from '@/lib/client/push-client';
import { isIOS, isStandalone, isIosNonSafari, getBrowserName } from '@/lib/client/platform';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState<RegionValue>({ city: '', district: '', wantsNational: true });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // iOS Safari (henüz ana ekrana eklenmemiş) → önce kurulum yönlendirmesi
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [iosOpenInSafari, setIosOpenInSafari] = useState(false);
  const [browserName, setBrowserName] = useState('tarayıcınız');
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [browseAnyway, setBrowseAnyway] = useState(false);

  useEffect(() => {
    const local = getLocalUser();
    if (local?.userId) {
      router.replace(local.notificationsEnabled ? '/feed' : '/setup');
      return;
    }
    (async () => {
      const recovered = await recoverFromDevice();
      if (recovered) {
        setLocalUser({
          userId: recovered.userId,
          email: recovered.email ?? undefined,
          name: recovered.name ?? undefined,
          contact: recovered.contact ?? undefined,
          age: recovered.age,
          gender: recovered.gender,
          occupation: recovered.occupation,
          city: recovered.city,
          district: recovered.district,
          wantsNational: recovered.wantsNational,
          consentAccepted: true,
          notificationsEnabled: true,
          mutedUntil: recovered.mutedUntil,
        });
        router.replace('/feed');
        return;
      }
      // iPhone/iPad, henüz ana ekrana eklenmemiş:
      if (!isStandalone() && isIOS()) {
        if (isIosNonSafari()) {
          // iOS'ta Safari dışı tarayıcı → push'lu kurulum yalnızca Safari'de çalışır
          setIosOpenInSafari(true);
          setBrowserName(getBrowserName());
        } else {
          // Safari → önce ana ekrana ekle, bölgeyi PWA'da seç
          setIosNeedsInstall(true);
        }
      }
      setReady(true);
    })();
  }, [router]);

  async function handleSubmit() {
    setError(null);
    if (!region.city) {
      setError('Lütfen ilinizi seçin.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<{ userId: string }>('/api/register', {
        city: region.city,
        district: region.district || null,
        wantsNational: region.wantsNational,
        consentAccepted: true,
      });
      setLocalUser({
        userId: res.userId,
        city: region.city,
        district: region.district || null,
        wantsNational: region.wantsNational,
        consentAccepted: true,
      });
      router.push('/setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu.');
      setLoading(false);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText('https://susma.org');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* yoksay */
    }
  }

  if (!ready) return null;

  const showOpenInSafari = iosOpenInSafari && !browseAnyway;
  const showInstallFirst = iosNeedsInstall && !browseAnyway;

  return (
    <main className="container max-w-md py-8">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Megaphone className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold leading-tight">
          Bölgenizdeki önemli duyuruları anında alın
        </h1>
        <p className="mt-2 text-muted-foreground">
          Uygulama indirmeden, ücretsiz. Sadece ilgilendiğiniz bölgeyi seçin.
        </p>
      </div>

      <ul className="mb-8 space-y-3">
        {[
          { icon: MapPin, text: 'Yalnızca seçtiğiniz bölgenin duyurularını alırsınız.' },
          { icon: Bell, text: 'Yeni bir duyuru olduğunda telefonunuza anında bildirim gelir.' },
          { icon: ShieldCheck, text: 'İzniniz olmadan bildirim gönderilmez. İstediğiniz an kapatabilirsiniz.' },
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

      {showOpenInSafari ? (
        // iOS'ta Safari dışı tarayıcı → push'lu kurulum yalnızca Safari'de mümkün
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Compass className="h-5 w-5 text-primary" />
            Bu sayfayı Safari’de açın
          </div>
          <p className="text-sm text-muted-foreground">
            iPhone’da bildirim alabilmek için Susma’nın <strong>Safari</strong>’de açılması gerekir
            ({browserName} bildirim destekli kurulumu desteklemiyor — bu bir iOS kısıtıdır). Adresi
            kopyalayıp Safari’ye yapıştırın ya da {browserName} menüsünden <strong>“Safari’de Aç”</strong> seçin.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              https://susma.org
            </code>
            <Button variant="outline" onClick={copyAddress}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </Button>
          </div>
          <button
            onClick={() => setBrowseAnyway(true)}
            className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Şimdilik bu tarayıcıda göz at (bildirimsiz)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : showInstallFirst ? (
        // iOS Safari: önce ana ekrana ekle, bölgeyi PWA içinde seç (Safari'de seçim taşınmaz — Apple kısıtı)
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Smartphone className="h-5 w-5 text-primary" />
            iPhone’da kurulum
          </div>
          <p className="text-sm text-muted-foreground">
            iPhone’da bildirim alabilmek için önce Susma’yı <strong>ana ekranınıza ekleyin</strong>,
            sonra oradaki Susma simgesinden açıp bölgenizi seçin.
          </p>
          <Button className="mt-4 w-full" size="lg" onClick={() => setSheetOpen(true)}>
            Ana ekrana nasıl eklerim?
          </Button>
          <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
            📱 <strong>Zaten eklediyseniz:</strong> bu sekmeyi kapatıp ana ekranınızdaki{' '}
            <strong>Susma</strong> simgesinden açın. (iPhone’da tarayıcı sekmesi ile uygulama ayrı
            çalışır; seçimler birbirine taşınmaz.)
          </p>
          <button
            onClick={() => setBrowseAnyway(true)}
            className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Şimdilik bu tarayıcıda göz at (bildirimsiz)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Bölgenizi seçin</h2>
          <RegionFields value={region} onChange={setRegion} />

          {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

          <Button className="mt-5 w-full" size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Kaydediliyor…' : 'Bölgemi Seç ve Devam Et'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Devam ederek seçtiğiniz bölgeye ait duyuruları almayı kabul edersiniz. Bilgileriniz
            yalnızca duyuru göndermek için kullanılır.
          </p>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Zaten üye misiniz?{' '}
        <Link href="/giris" className="font-medium text-primary hover:underline">
          Giriş yapın
        </Link>
      </p>

      <IosInstallSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </main>
  );
}
