import 'server-only';
import webpush, { WebPushError } from 'web-push';
import { Prisma, DeliveryStatus, type Announcement } from '@prisma/client';
import { prisma } from './prisma';
import { env } from './env';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    throw new Error(
      'VAPID anahtarları tanımlı değil. .env içine VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY ekleyin (npm run vapid).',
    );
  }
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
}

// Bir duyurunun hedef kitlesini belirleyen Prisma where koşulu.
// Sessize alınmış (mutedUntil > now) kullanıcılar hedef dışı bırakılır.
export function buildAudienceWhere(
  a: Pick<Announcement, 'isNational' | 'city' | 'district'>,
  now: Date = new Date(),
) {
  const notMuted = { OR: [{ mutedUntil: null }, { mutedUntil: { lte: now } }] };
  if (a.isNational) {
    return { isActive: true, user: { wantsNational: true, ...notMuted } };
  }
  if (a.district) {
    return { isActive: true, user: { city: a.city ?? undefined, district: a.district, ...notMuted } };
  }
  // İl geneli: ildeki herkes (ilçe fark etmeksizin)
  return { isActive: true, user: { city: a.city ?? undefined, ...notMuted } };
}

export type DispatchSummary = {
  audience: number;
  sent: number;
  failed: number;
  deactivated: number;
};

// Bir duyuruyu hedef kitledeki aktif aboneliklere gönderir, sonuçları loglar.
export async function dispatchAnnouncement(announcementId: string): Promise<DispatchSummary> {
  ensureConfigured();

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) throw new Error('Duyuru bulunamadı');

  const subs = await prisma.pushSubscription.findMany({
    where: buildAudienceWhere(announcement),
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  const publicId = announcement.publicId ?? announcement.id;
  const payload = JSON.stringify({
    title: announcement.title,
    body: announcement.body,
    data: { announcementId: publicId, url: `/a/${publicId}` },
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
  });

  let sent = 0;
  let failed = 0;
  let deactivated = 0;
  const logs: Prisma.DeliveryLogCreateManyInput[] = [];
  const successIds: string[] = [];
  const failIds: string[] = [];
  const deadIds: string[] = [];

  const CHUNK = 100;
  for (let i = 0; i < subs.length; i += CHUNK) {
    const chunk = subs.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        ),
      ),
    );

    results.forEach((res, idx) => {
      const sub = chunk[idx];
      if (res.status === 'fulfilled') {
        sent += 1;
        successIds.push(sub.id);
        logs.push({
          announcementId,
          pushSubscriptionId: sub.id,
          status: DeliveryStatus.sent,
        });
        return;
      }
      const err = res.reason as unknown;
      const statusCode = err instanceof WebPushError ? err.statusCode : undefined;
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      failed += 1;
      if (statusCode === 404 || statusCode === 410) {
        // Expired/gone → aboneliği pasifleştir
        deadIds.push(sub.id);
        deactivated += 1;
      } else {
        failIds.push(sub.id);
      }
      logs.push({
        announcementId,
        pushSubscriptionId: sub.id,
        status: DeliveryStatus.failed,
        errorCode: statusCode ? String(statusCode) : null,
        errorMessage: message.slice(0, 300),
      });
    });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (logs.length) await tx.deliveryLog.createMany({ data: logs });
    if (successIds.length) {
      await tx.pushSubscription.updateMany({
        where: { id: { in: successIds } },
        data: { lastSuccessAt: now },
      });
    }
    if (failIds.length) {
      await tx.pushSubscription.updateMany({
        where: { id: { in: failIds } },
        data: { lastFailureAt: now },
      });
    }
    if (deadIds.length) {
      await tx.pushSubscription.updateMany({
        where: { id: { in: deadIds } },
        data: { isActive: false, lastFailureAt: now },
      });
    }
  });

  return { audience: subs.length, sent, failed, deactivated };
}
