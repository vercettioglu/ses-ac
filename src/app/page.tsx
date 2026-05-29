'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Bell, MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegionFields, type RegionValue } from '@/components/region-fields';
import { apiPost } from '@/lib/client/api';
import { getLocalUser, setLocalUser } from '@/lib/client/storage';
import { recoverFromDevice } from '@/lib/client/push-client';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState<RegionValue>({ city: '', district: '', wantsNational: true });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = getLocalUser();
    if (local?.userId) {
      // Daha önce kayıt olmuş: bildirim izni verdiyse akışa, vermediyse izin adımına git
      router.replace(local.notificationsEnabled ? '/feed' : '/setup');
      return;
    }
    // localStorage boş → cihazın push endpoint'inden eski kaydı (ad/telefon/bölge) kurtarmayı dene
    (async () => {
      const recovered = await recoverFromDevice();
      if (recovered) {
        setLocalUser({
          userId: recovered.userId,
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

  if (!ready) return null;

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
    </main>
  );
}
