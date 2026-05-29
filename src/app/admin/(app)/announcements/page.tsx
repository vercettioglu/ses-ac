'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiGet } from '@/lib/client/api';
import { regionLabel } from '@/components/announcement-card';
import { timeAgoTr } from '@/lib/utils';

type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  city: string | null;
  district: string | null;
  isNational: boolean;
  createdAt: string;
  createdBy: { name: string; email: string } | null;
  _count: { deliveryLogs: number };
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ items: AdminAnnouncement[] }>('/api/announcements?scope=all')
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tüm Duyurular</h1>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz duyuru yok.</p>
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
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>Gönderen: {a.createdBy?.name ?? '—'}</span>
                <span>·</span>
                <span>{a._count.deliveryLogs} gönderim kaydı</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
