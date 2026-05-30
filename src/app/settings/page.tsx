'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, Save, Smartphone, UserPlus, Moon } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RegionFields, type RegionValue } from '@/components/region-fields';
import { IosInstallSheet } from '@/components/ios-install-sheet';
import { apiPost } from '@/lib/client/api';
import { getLocalUser, setLocalUser, type LocalUser, type Gender } from '@/lib/client/storage';
import { enablePush, hasActiveSubscription, showLocalNotification } from '@/lib/client/push-client';
import { isIOS, isStandalone, pushSupported } from '@/lib/client/platform';
import { NotificationHelp } from '@/components/notification-help';
import { isValidTrMobile, normalizeTrMobile } from '@/lib/phone';

type NotifState = 'on' | 'off' | 'unsupported' | 'busy';

const SNOOZE_OPTIONS = [
  { label: '1 saat', hours: 1 },
  { label: '8 saat', hours: 8 },
  { label: '1 gün', hours: 24 },
  { label: '1 hafta', hours: 168 },
];

const GENDER_OPTIONS: { value: '' | Gender; label: string }[] = [
  { value: '', label: 'Seçiniz' },
  { value: 'FEMALE', label: 'Kadın' },
  { value: 'MALE', label: 'Erkek' },
  { value: 'UNSPECIFIED', label: 'Belirtmek istemiyorum' },
];

// Form durumunu karşılaştırılabilir bir dizeye çevirir (değişiklik tespiti için).
function makeSnap(f: {
  name?: string;
  phone?: string;
  age?: string;
  gender?: string;
  occupation?: string;
  city?: string;
  district?: string;
  wantsNational?: boolean;
}): string {
  return JSON.stringify({
    name: (f.name || '').trim(),
    phone: (f.phone || '').trim(),
    age: (f.age || '').trim(),
    gender: f.gender || '',
    occupation: (f.occupation || '').trim(),
    city: f.city || '',
    district: f.district || '',
    wantsNational: Boolean(f.wantsNational),
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [region, setRegion] = useState<RegionValue>({ city: '', district: '', wantsNational: false });

  // İletişim / profil alanları
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'' | Gender>('');
  const [occupation, setOccupation] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [initialSnap, setInitialSnap] = useState('');

  const [notif, setNotif] = useState<NotifState>('off');
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const local = getLocalUser();
    if (!local?.userId) {
      router.replace('/');
      return;
    }
    setUserId(local.userId);
    setRegion({
      city: local.city || '',
      district: local.district || '',
      wantsNational: Boolean(local.wantsNational),
    });
    setName(local.name || '');
    setPhone(local.contact || '');
    setAge(local.age != null ? String(local.age) : '');
    setGender((local.gender as Gender) || '');
    setOccupation(local.occupation || '');
    setMutedUntil(local.mutedUntil || null);
    setInitialSnap(
      makeSnap({
        name: local.name || '',
        phone: local.contact || '',
        age: local.age != null ? String(local.age) : '',
        gender: local.gender || '',
        occupation: local.occupation || '',
        city: local.city || '',
        district: local.district || '',
        wantsNational: Boolean(local.wantsNational),
      }),
    );

    (async () => {
      if (isIOS() && !isStandalone()) {
        setIosNeedsInstall(true);
        setNotif('off');
      } else if (!pushSupported()) {
        setNotif('unsupported');
      } else {
        setNotif((await hasActiveSubscription()) ? 'on' : 'off');
      }
      setReady(true);
    })();
  }, [router]);

  const isMuted = Boolean(mutedUntil && new Date(mutedUntil).getTime() > Date.now());

  async function handleSave() {
    setSaveMsg(null);
    if (!region.city) {
      setSaveMsg('Lütfen ilinizi seçin.');
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidTrMobile(trimmedPhone)) {
      setSaveMsg('Geçerli bir cep telefonu girin (örn. 0539 624 92 95).');
      return;
    }
    const ageNum = age.trim() ? Number(age.trim()) : null;
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120)) {
      setSaveMsg('Geçerli bir yaş girin (1-120).');
      return;
    }

    setSaving(true);
    try {
      const normalizedPhone = trimmedPhone ? normalizeTrMobile(trimmedPhone) : null;
      // Sunucu yeni bir kayıt oluşturduysa (eski userId DB'de yoksa) dönen id'yi benimse
      const res = await apiPost<{ userId: string }>('/api/register', {
        userId,
        name: name.trim() || null,
        contact: normalizedPhone,
        age: ageNum,
        gender: gender || null,
        occupation: occupation.trim() || null,
        city: region.city,
        district: region.district || null,
        wantsNational: region.wantsNational,
        consentAccepted: true,
      });
      const next: Partial<LocalUser> = {
        userId: res.userId,
        city: region.city,
        district: region.district || null,
        wantsNational: region.wantsNational,
        name: name.trim() || undefined,
        contact: normalizedPhone || undefined,
        age: ageNum,
        gender: gender || null,
        occupation: occupation.trim() || null,
      };
      setLocalUser(next);
      setUserId(res.userId);
      if (normalizedPhone) setPhone(normalizedPhone);
      setInitialSnap(
        makeSnap({
          name: name.trim(),
          phone: normalizedPhone || '',
          age: ageNum != null ? String(ageNum) : '',
          gender,
          occupation: occupation.trim(),
          city: region.city,
          district: region.district,
          wantsNational: region.wantsNational,
        }),
      );
      setSaveMsg('Kaydedildi.');
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function enable() {
    setNotifMsg(null);
    setNotif('busy');
    const res = await enablePush(userId);
    if (res.ok) {
      setLocalUser({ notificationsEnabled: true });
      setNotif('on');
      void showLocalNotification('Susma bildirimleri açık ✅', 'Bölgenizdeki duyuruları artık anında alacaksınız.');
    } else {
      setNotif('off');
      setNotifMsg(res.message);
    }
  }

  async function snooze(hours: number) {
    setNotifMsg(null);
    try {
      const res = await apiPost<{ mutedUntil: string | null }>('/api/push/snooze', { userId, hours });
      setMutedUntil(res.mutedUntil);
      setLocalUser({ mutedUntil: res.mutedUntil });
    } catch (e) {
      setNotifMsg(e instanceof Error ? e.message : 'İşlem başarısız.');
    }
  }

  if (!ready) return null;

  const currentSnap = makeSnap({
    name,
    phone,
    age,
    gender,
    occupation,
    city: region.city,
    district: region.district,
    wantsNational: region.wantsNational,
  });
  const dirty = currentSnap !== initialSnap;

  return (
    <>
      <AppHeader showSettings={false} />
      <main className="container max-w-md space-y-6 py-5 pb-28">
        <h1 className="text-xl font-bold">Ayarlar</h1>

        {/* İletişim / profil bilgileri (EN ÜSTTE, isteğe bağlı, hesap/şifre yok) */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">İletişim bilgileriniz (isteğe bağlı)</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Hesap oluşturmanıza veya şifre belirlemenize gerek yok — cihazınız sizi hatırlar.
            Dilerseniz size ulaşabilmemiz için bilgilerinizi bırakabilirsiniz.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız Soyadınız" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Cep Telefonu</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Yaş</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Örn. 34"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Cinsiyet</Label>
                <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as '' | Gender)}>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Meslek</Label>
              <Input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Örn. Öğretmen"
              />
            </div>
          </div>
        </section>

        {/* Bildirimler */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Bildirimler</h2>

          {iosNeedsInstall ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                Bildirimler için Susma’yı ana ekranınıza ekleyin.
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSheetOpen(true)}>
                Nasıl eklerim?
              </Button>
            </div>
          ) : notif === 'unsupported' ? (
            <p className="text-sm text-muted-foreground">
              Bu cihaz/tarayıcı anlık bildirimleri desteklemiyor.
            </p>
          ) : notif === 'off' ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Bölgenizdeki duyuruları kaçırmamak için bildirimleri açın.
              </p>
              <Button className="w-full" onClick={enable}>
                Bildirimleri Aç
              </Button>
              {notifMsg && <p className="mt-3 text-sm text-destructive">{notifMsg}</p>}
            </>
          ) : isMuted ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span>
                  Bildirimler{' '}
                  <strong>{new Date(mutedUntil!).toLocaleString('tr-TR')}</strong> tarihine kadar
                  sessizde.
                </span>
              </div>
              <Button className="w-full" onClick={() => snooze(0)}>
                <BellRing className="h-4 w-4" />
                Sessize almayı kaldır
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Bell className="h-4 w-4" /> Bildirimler açık
              </div>
              <p className="mb-2 text-sm text-muted-foreground">
                Bir süreliğine sessize alabilirsiniz; süre sonunda kendiliğinden geri açılır.
              </p>
              <div className="flex flex-wrap gap-2">
                {SNOOZE_OPTIONS.map((o) => (
                  <Button key={o.hours} variant="outline" size="sm" onClick={() => snooze(o.hours)}>
                    {o.label} sessize al
                  </Button>
                ))}
              </div>
              {notifMsg && <p className="mt-3 text-sm text-destructive">{notifMsg}</p>}
            </>
          )}

          {notif === 'on' && (
            <div className="mt-4">
              <NotificationHelp />
            </div>
          )}
        </section>

        {/* Bölge */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Bölgeniz</h2>
          <RegionFields value={region} onChange={setRegion} />
        </section>

      </main>

      {/* Sticky kaydet çubuğu — mobilde altta sabit, değişiklik yoksa pasif */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="safe-bottom container max-w-md py-3">
          {saveMsg && !(saveMsg === 'Kaydedildi.' && dirty) && (
            <p
              className={
                saveMsg === 'Kaydedildi.'
                  ? 'mb-2 text-center text-sm font-medium text-emerald-600'
                  : 'mb-2 text-center text-sm font-medium text-destructive'
              }
            >
              {saveMsg}
            </p>
          )}
          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="h-5 w-5" />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>

      <IosInstallSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
