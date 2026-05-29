'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/client/api';
import { regionLabel } from '@/components/announcement-card';
import { timeAgoTr } from '@/lib/utils';

type MineAnnouncement = {
  id: string;
  title: string;
  body: string;
  city: string | null;
  district: string | null;
  isNational: boolean;
  createdAt: string;
  stats: { sent: number; failed: number; pending: number };
};

export default function PanelHistoryPage() {
  const [items, setItems] = useState<MineAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ items: MineAnnouncement[] }>('/api/announcements?scope=mine')
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Gönderim Geçmişi</h1>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz duyuru göndermediniz.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {a.isNational ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                {regionLabel(a)}
                <span aria-hidden>·</span>
                {timeAgoTr(a.createdAt)}
              </div>
              <Link href={`/a/${a.id}`} className="font-semibold hover:underline">
                {a.title}
              </Link>
              <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="success">{a.stats.sent} iletildi</Badge>
                {a.stats.failed > 0 && <Badge variant="destructive">{a.stats.failed} başarısız</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
