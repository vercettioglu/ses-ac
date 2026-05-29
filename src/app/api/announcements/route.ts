import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { announcementCreateSchema } from '@/lib/validation';
import { requireSession, loadActor, authorizeTarget } from '@/lib/auth';
import { dispatchAnnouncement } from '@/lib/push';
import { getSenderRateLimitPerMin } from '@/lib/settings';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { nextId } from '@/lib/snowflake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Duyuruyu benzersiz sayısal publicId ile oluşturur (nadir çakışmada tekrar dener).
async function createAnnouncement(data: Prisma.AnnouncementUncheckedCreateInput) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.announcement.create({ data: { ...data, publicId: nextId() } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 4) {
        continue;
      }
      throw e;
    }
  }
  throw new Error('Duyuru kimliği üretilemedi');
}

// Client'a iç CUID yerine sayısal publicId'yi `id` olarak verir (URL'de sayısal görünür).
function withPublicId<T extends { id: string; publicId?: string | null }>(a: T) {
  const { publicId, ...rest } = a;
  return { ...rest, id: publicId ?? a.id };
}

// GET: scope=all (admin) | scope=mine (gönderici geçmişi) | public feed (city/district)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');

    if (scope === 'all') {
      await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
      const items = await prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          createdBy: { select: { name: true, email: true } },
          _count: { select: { deliveryLogs: true } },
        },
      });
      return ok({ items: items.map(withPublicId) });
    }

    if (scope === 'mine') {
      const s = await requireSession();
      const items = await prisma.announcement.findMany({
        where: { createdById: s.sub },
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { _count: { select: { deliveryLogs: true } } },
      });
      // Her duyuru için gönderim kırılımı (sent/failed)
      const withStats = await Promise.all(
        items.map(async (a) => {
          const grouped = await prisma.deliveryLog.groupBy({
            by: ['status'],
            where: { announcementId: a.id },
            _count: true,
          });
          const stats = { sent: 0, failed: 0, pending: 0 };
          grouped.forEach((g) => {
            stats[g.status] = g._count;
          });
          return { ...withPublicId(a), stats };
        }),
      );
      return ok({ items: withStats });
    }

    // Public feed: ulusal + kullanıcının ili + ilçesi
    const city = searchParams.get('city')?.trim() || undefined;
    const district = searchParams.get('district')?.trim() || undefined;
    const or: Prisma.AnnouncementWhereInput[] = [{ isNational: true }];
    if (city) {
      or.push({ city, district: null });
      if (district) or.push({ city, district });
    }
    const items = await prisma.announcement.findMany({
      where: { OR: or },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        publicId: true,
        title: true,
        body: true,
        city: true,
        district: true,
        isNational: true,
        senderName: true,
        createdAt: true,
      },
    });
    return ok({ items: items.map(withPublicId) });
  } catch (err) {
    return handleError(err);
  }
}

// POST: yeni duyuru oluştur + hedef kitleye gönder.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const session = await requireSession(['SUPER_ADMIN', 'REGION_ADMIN', 'SENDER']);
    const actor = await loadActor(session.sub);
    const data = announcementCreateSchema.parse(await req.json());

    // Rate limit (admin ayarlanabilir; tüm gönderenlere uygulanır)
    const limit = await getSenderRateLimitPerMin();
    const rl = checkRateLimit(`ann:${actor.id}`, limit);
    if (!rl.allowed) {
      return fail(
        `Çok sık gönderim yapıyorsunuz. ${rl.retryAfterSec} saniye sonra tekrar deneyin.`,
        429,
        { retryAfterSec: rl.retryAfterSec },
      );
    }

    const perms = actor.permissions.map((p) => ({ city: p.city, district: p.district }));
    const targets: { city: string | null; district: string | null; isNational: boolean }[] = [];

    if (data.scope === 'national') {
      const authz = authorizeTarget(actor.role, perms, { kind: 'national' });
      if (!authz.allowed) return fail(authz.reason ?? 'Yetkisiz işlem', 403);
      targets.push({ city: null, district: null, isNational: true });
    } else if (data.scope === 'city') {
      const city = data.city!;
      const authz = authorizeTarget(actor.role, perms, { kind: 'city', city });
      if (!authz.allowed) return fail(authz.reason ?? 'Yetkisiz işlem', 403);
      targets.push({ city, district: null, isNational: false });
    } else {
      // districts: her ilçe için ayrı yetki kontrolü + ayrı duyuru
      const city = data.city!;
      const unique = Array.from(new Set(data.districts!));
      for (const d of unique) {
        const authz = authorizeTarget(actor.role, perms, { kind: 'district', city, district: d });
        if (!authz.allowed) return fail(`${city} / ${d}: ${authz.reason ?? 'Yetkisiz'}`, 403);
      }
      unique.forEach((d) => targets.push({ city, district: d, isNational: false }));
    }

    const created = [];
    for (const t of targets) {
      const announcement = await createAnnouncement({
        title: data.title,
        body: data.body,
        city: t.city,
        district: t.district,
        isNational: t.isNational,
        createdById: actor.id,
        senderName: actor.name,
      });
      const summary = await dispatchAnnouncement(announcement.id);
      created.push({
        id: announcement.id,
        city: t.city,
        district: t.district,
        isNational: t.isNational,
        ...summary,
      });
      await logAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'announcement.create',
        targetType: 'Announcement',
        targetId: announcement.id,
        meta: {
          title: data.title,
          city: t.city,
          district: t.district,
          isNational: t.isNational,
          summary,
        },
      });
    }

    const totals = created.reduce(
      (acc, c) => ({
        audience: acc.audience + c.audience,
        sent: acc.sent + c.sent,
        failed: acc.failed + c.failed,
        deactivated: acc.deactivated + c.deactivated,
      }),
      { audience: 0, sent: 0, failed: 0, deactivated: 0 },
    );

    return ok({ announcements: created, totals });
  } catch (err) {
    return handleError(err);
  }
}
