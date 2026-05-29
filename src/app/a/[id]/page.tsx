'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Globe, MapPin } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { regionLabel, type AnnouncementItem } from '@/components/announcement-card';
import { apiGet, ApiError } from '@/lib/client/api';
import { timeAgoTr } from '@/lib/utils';

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    (async () => {
      try {
        const res = await apiGet<{ announcement: AnnouncementItem }>(`/api/announcements/${id}`);
        setItem(res.announcement);
      } catch (e) {
        setError(e instanceof ApiError && e.status === 404 ? 'Duyuru bulunamadı.' : 'Duyuru yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  return (
    <>
      <AppHeader />
      <main className="container max-w-md py-5">
        <button
          onClick={() => router.push('/feed')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Duyurulara dön
        </button>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
          </div>
        ) : error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : item ? (
          <article>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {item.isNational ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              <span>{regionLabel(item)}</span>
              <span aria-hidden>·</span>
              <span>{timeAgoTr(item.createdAt)}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight">{item.title}</h1>
            {item.senderName && (
              <p className="mt-1 text-sm text-muted-foreground">Gönderen: {item.senderName}</p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">{item.body}</p>
            <p className="mt-6 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString('tr-TR')}
            </p>
          </article>
        ) : null}
      </main>
    </>
  );
}
