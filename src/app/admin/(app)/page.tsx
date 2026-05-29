'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BellRing, Megaphone, CheckCheck, XCircle, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiGet, apiPost, apiPatch } from '@/lib/client/api';
import { useSession } from '@/lib/client/use-session';

type Stats = {
  totals: {
    users: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    totalSubscriptions: number;
    announcements: number;
  };
  delivery: { sent: number; failed: number; pending: number };
};

export default function AdminDashboardPage() {
  const session = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rateLimit, setRateLimit] = useState<number>(3);
  const [rateInput, setRateInput] = useState<string>('3');
  const [savingRate, setSavingRate] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  async function loadAll() {
    try {
      const [s, settings] = await Promise.all([
        apiGet<Stats>('/api/admin/stats'),
        apiGet<{ senderRateLimitPerMin: number }>('/api/admin/settings'),
      ]);
      setStats(s);
      setRateLimit(settings.senderRateLimitPerMin);
      setRateInput(String(settings.senderRateLimitPerMin));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi');
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function saveRate() {
    setSavingRate(true);
    setRateMsg(null);
    try {
      const res = await apiPatch<{ senderRateLimitPerMin: number }>('/api/admin/settings', {
        senderRateLimitPerMin: Number(rateInput),
      });
      setRateLimit(res.senderRateLimitPerMin);
      setRateMsg('Kaydedildi.');
    } catch (e) {
      setRateMsg(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingRate(false);
    }
  }

  async function cleanup() {
    setCleaning(true);
    setCleanMsg(null);
    try {
      const res = await apiPost<{ deleted: number }>('/api/admin/subscriptions/cleanup');
      setCleanMsg(`${res.deleted} kayıt temizlendi.`);
      void loadAll();
    } catch (e) {
      setCleanMsg(e instanceof Error ? e.message : 'Temizlenemedi');
    } finally {
      setCleaning(false);
    }
  }

  const cards = stats
    ? [
        { icon: Users, label: 'Kullanıcı', value: stats.totals.users },
        { icon: BellRing, label: 'Aktif abonelik', value: stats.totals.activeSubscriptions },
        { icon: Megaphone, label: 'Duyuru', value: stats.totals.announcements },
        { icon: CheckCheck, label: 'Başarılı gönderim', value: stats.delivery.sent },
        { icon: XCircle, label: 'Başarısız gönderim', value: stats.delivery.failed },
        {
          icon: Trash2,
          label: 'Pasif abonelik',
          value: stats.totals.inactiveSubscriptions,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Özet</h1>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Rate limit ayarı */}
      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Gönderim hız sınırı</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Bir göndericinin dakikada gönderebileceği en fazla duyuru sayısı.
          {!isSuperAdmin && ' (Yalnızca Süper Yönetici değiştirebilir.)'}
        </p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={120}
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            className="w-28"
            disabled={!isSuperAdmin}
          />
          <span className="text-sm text-muted-foreground">duyuru / dakika</span>
          {isSuperAdmin && (
            <Button onClick={saveRate} disabled={savingRate} size="sm">
              <Save className="h-4 w-4" />
              {savingRate ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          )}
        </div>
        {rateMsg && (
          <p
            className={
              rateMsg === 'Kaydedildi.'
                ? 'mt-2 text-sm text-emerald-600'
                : 'mt-2 text-sm text-destructive'
            }
          >
            {rateMsg}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Mevcut: {rateLimit} / dakika</p>
      </Card>

      {/* Temizlik */}
      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Abonelik bakımı</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Geçersiz/expired (pasif) push aboneliklerini kalıcı olarak temizleyin.
        </p>
        <Button variant="outline" onClick={cleanup} disabled={cleaning}>
          <Trash2 className="h-4 w-4" />
          {cleaning ? 'Temizleniyor…' : 'Pasif abonelikleri temizle'}
        </Button>
        {cleanMsg && <p className="mt-2 text-sm text-muted-foreground">{cleanMsg}</p>}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/senders" className="text-sm font-medium text-primary hover:underline">
          Göndericileri yönet →
        </Link>
        <Link href="/admin/subscribers" className="text-sm font-medium text-primary hover:underline">
          Abone istatistikleri →
        </Link>
      </div>
    </div>
  );
}
