'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { apiGet } from '@/lib/client/api';

type Stats = {
  totals: {
    users: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    totalSubscriptions: number;
  };
  delivery: { sent: number; failed: number; pending: number };
  byRegion: { city: string; district: string | null; subscribers: number }[];
};

export default function SubscribersPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Stats>('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Aboneler</h1>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats.totals.activeSubscriptions}</div>
              <div className="text-sm text-muted-foreground">Aktif abonelik</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats.totals.users}</div>
              <div className="text-sm text-muted-foreground">Kullanıcı</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.delivery.sent}</div>
              <div className="text-sm text-muted-foreground">Başarılı gönderim</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-destructive">{stats.delivery.failed}</div>
              <div className="text-sm text-muted-foreground">Başarısız gönderim</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border p-4 font-semibold">İl / İlçe bazında abone sayısı</div>
            {stats.byRegion.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Henüz aktif abone yok.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.byRegion.map((r, i) => (
                  <li key={`${r.city}-${r.district ?? ''}-${i}`} className="flex items-center justify-between p-4">
                    <span>
                      {r.city}
                      {r.district ? ` · ${r.district}` : ' · (il geneli / ilçesiz)'}
                    </span>
                    <span className="font-semibold">{r.subscribers}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
