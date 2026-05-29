'use client';

import Link from 'next/link';
import { Globe, MapPin, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, timeAgoTr, isOlderThan24h } from '@/lib/utils';

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  city: string | null;
  district: string | null;
  isNational: boolean;
  senderName?: string | null;
  createdAt: string;
};

export function regionLabel(a: Pick<AnnouncementItem, 'isNational' | 'city' | 'district'>): string {
  if (a.isNational) return 'Tüm Türkiye';
  if (a.city && a.district) return `${a.city} · ${a.district}`;
  if (a.city) return `${a.city} geneli`;
  return 'Duyuru';
}

export function AnnouncementCard({ a }: { a: AnnouncementItem }) {
  const old = isOlderThan24h(a.createdAt);
  return (
    <Link href={`/a/${a.id}`} className="block">
      <Card
        className={cn(
          'transition-opacity hover:border-primary/40',
          // 24 saatten eski duyurular silik görünür (silinmez)
          old ? 'opacity-55' : 'opacity-100',
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {a.isNational ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              <span>{regionLabel(a)}</span>
              <span aria-hidden>·</span>
              <span>{timeAgoTr(a.createdAt)}</span>
            </div>
            <h3 className="font-semibold leading-snug">{a.title}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
            {a.senderName && (
              <p className="pt-0.5 text-xs text-muted-foreground">Gönderen: {a.senderName}</p>
            )}
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
