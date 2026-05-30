'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, MapPin, Send, Bell, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Card } from '@/components/ui/card';
import { apiPost } from '@/lib/client/api';
import { useSession } from '@/lib/client/use-session';
import { PROVINCES, getDistricts } from '@/lib/regions';
import { TITLE_MAX, BODY_MAX } from '@/lib/validation';
import { cn } from '@/lib/utils';

type Scope = 'national' | 'city' | 'districts';
type Totals = { audience: number; sent: number; failed: number; deactivated: number };

export default function PanelNewAnnouncementPage() {
  const session = useSession();
  const role = session?.user?.role;
  const perms = useMemo(() => session?.permissions ?? [], [session]);
  const isSuper = role === 'SUPER_ADMIN';

  const fullCities = useMemo(
    () => (isSuper ? PROVINCES : Array.from(new Set(perms.filter((p) => p.district == null).map((p) => p.city)))),
    [isSuper, perms],
  );
  const anyCities = useMemo(
    () => (isSuper ? PROVINCES : Array.from(new Set(perms.map((p) => p.city)))),
    [isSuper, perms],
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<Scope>('city');
  const [city, setCity] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [freeDistrict, setFreeDistrict] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Varsayılan scope'u yetkiye göre belirle
  useEffect(() => {
    if (!session) return;
    if (isSuper) setScope('national');
    else if (fullCities.length > 0) setScope('city');
    else setScope('districts');
  }, [session, isSuper, fullCities.length]);

  const allowedDistricts = useMemo(() => {
    if (!city) return [];
    if (isSuper) return getDistricts(city);
    const cityPerms = perms.filter((p) => p.city === city);
    if (cityPerms.some((p) => p.district == null)) return getDistricts(city);
    return cityPerms.map((p) => p.district!).filter(Boolean);
  }, [city, isSuper, perms]);

  const scopeOptions: { value: Scope; label: string; show: boolean }[] = [
    { value: 'national', label: 'Tüm Türkiye', show: isSuper },
    { value: 'city', label: 'İl geneli', show: fullCities.length > 0 },
    { value: 'districts', label: 'Belirli ilçeler', show: anyCities.length > 0 },
  ];

  const cityChoices = scope === 'city' ? fullCities : anyCities;

  function toggleDistrict(d: string) {
    setDistricts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function addFreeDistrict() {
    const d = freeDistrict.trim();
    if (d && !districts.includes(d)) setDistricts([...districts, d]);
    setFreeDistrict('');
  }

  function validate(): string | null {
    if (!title.trim()) return 'Başlık girin.';
    if (title.length > TITLE_MAX) return `Başlık en fazla ${TITLE_MAX} karakter.`;
    if (!body.trim()) return 'Mesaj girin.';
    if (body.length > BODY_MAX) return `Mesaj en fazla ${BODY_MAX} karakter.`;
    if (scope !== 'national' && !city) return 'İl seçin.';
    if (scope === 'districts' && districts.length === 0) return 'En az bir ilçe seçin.';
    return null;
  }

  function openConfirm() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setConfirmOpen(true);
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { title: title.trim(), body: body.trim(), scope };
      if (scope === 'city') payload.city = city;
      if (scope === 'districts') {
        payload.city = city;
        payload.districts = districts;
      }
      const res = await apiPost<{ totals: Totals }>('/api/announcements', payload);
      setResult(res.totals);
      setConfirmOpen(false);
      // Formu sıfırla
      setTitle('');
      setBody('');
      setDistricts([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gönderilemedi');
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }

  const targetText =
    scope === 'national'
      ? 'Tüm Türkiye (ulusal duyuruları açık kullanıcılar)'
      : scope === 'city'
        ? `${city || '—'} geneli`
        : `${city || '—'} · ${districts.length ? districts.join(', ') : '—'}`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Yeni Duyuru</h1>

      {role === 'SENDER' && (
        <p className="text-sm text-muted-foreground">
          {session?.parent ? (
            <>
              Bağlı olduğunuz il yöneticisi:{' '}
              <span className="font-medium text-foreground">{session.parent.name}</span>
            </>
          ) : (
            'Henüz bir il yöneticisine bağlı değilsiniz.'
          )}
        </p>
      )}

      {result && (
        <Card className="border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Duyuru gönderildi
          </div>
          <p className="mt-1 text-sm text-emerald-800">
            {result.sent} bildirim iletildi · {result.failed} başarısız · hedef kitle{' '}
            {result.audience} cihaz
            {result.deactivated > 0 ? ` · ${result.deactivated} pasif abonelik temizlendi` : ''}
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="space-y-5">
          {/* Başlık */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Başlık</Label>
              <span className={cn('text-xs', title.length > TITLE_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="title"
              value={title}
              maxLength={TITLE_MAX + 10}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kısa ve net bir başlık"
            />
          </div>

          {/* Mesaj */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Mesaj</Label>
              <span className={cn('text-xs', body.length > BODY_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <Textarea
              id="body"
              value={body}
              maxLength={BODY_MAX + 20}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Duyuru metni"
            />
          </div>

          {/* Hedef bölge */}
          <div className="space-y-2">
            <Label>Hedef bölge</Label>
            <div className="flex flex-wrap gap-2">
              {scopeOptions
                .filter((o) => o.show)
                .map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      setScope(o.value);
                      setDistricts([]);
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium',
                      scope === o.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted',
                    )}
                  >
                    {o.value === 'national' ? (
                      <Globe className="mr-1 inline h-4 w-4" />
                    ) : (
                      <MapPin className="mr-1 inline h-4 w-4" />
                    )}
                    {o.label}
                  </button>
                ))}
            </div>
          </div>

          {scope !== 'national' && (
            <div className="space-y-2">
              <Label htmlFor="t-city">İl</Label>
              <Combobox
                id="t-city"
                value={city}
                options={cityChoices}
                placeholder="İl arayın veya seçin"
                onChange={(c) => {
                  setCity(c);
                  setDistricts([]);
                }}
              />
            </div>
          )}

          {scope === 'districts' && city && (
            <div className="space-y-2">
              <Label>İlçeler</Label>
              {allowedDistricts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allowedDistricts.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDistrict(d)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm',
                        districts.includes(d)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:bg-muted',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="İlçe adı yazıp ekleyin"
                    value={freeDistrict}
                    onChange={(e) => setFreeDistrict(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFreeDistrict();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addFreeDistrict}>
                    Ekle
                  </Button>
                </div>
              )}
              {districts.length > 0 && (
                <p className="text-sm text-muted-foreground">Seçili: {districts.join(', ')}</p>
              )}
            </div>
          )}

          {/* Önizleme */}
          <div className="space-y-2">
            <Label>Önizleme</Label>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bell className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold">{title || 'Başlık'}</div>
                <div className="line-clamp-2 text-sm text-muted-foreground">
                  {body || 'Mesaj metni burada görünecek.'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Susma · {targetText}</div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button className="w-full" size="lg" onClick={openConfirm}>
            <Send className="h-5 w-5" />
            Gönder
          </Button>
        </div>
      </Card>

      {/* Onay modalı */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button aria-label="Kapat" className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <Card className="relative w-full max-w-sm p-5">
            <button
              aria-label="Kapat"
              onClick={() => setConfirmOpen(false)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-2 text-lg font-bold">Göndermeyi onayla</h2>
            <p className="text-sm text-muted-foreground">
              Bu duyuru <strong>{targetText}</strong> bölgesindeki bildirim izni vermiş kullanıcılara
              gönderilecek.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)} disabled={sending}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={send} disabled={sending}>
                {sending ? 'Gönderiliyor…' : 'Onayla ve Gönder'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
