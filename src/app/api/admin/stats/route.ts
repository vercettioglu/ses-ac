import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, handleError } from '@/lib/http';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RegionRow = { city: string; district: string | null; subscribers: bigint };

// Özet istatistikler: kullanıcı/abone sayıları, il-ilçe kırılımı, gönderim sonuçları.
export async function GET() {
  try {
    await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);

    const [
      totalUsers,
      activeSubscriptions,
      totalSubscriptions,
      inactiveSubscriptions,
      totalAnnouncements,
      deliveryGrouped,
      regionRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.pushSubscription.count({ where: { isActive: true } }),
      prisma.pushSubscription.count(),
      prisma.pushSubscription.count({ where: { isActive: false } }),
      prisma.announcement.count(),
      prisma.deliveryLog.groupBy({ by: ['status'], _count: true }),
      // Aktif aboneliklerin il/ilçe kırılımı (User ile join).
      prisma.$queryRaw<RegionRow[]>(Prisma.sql`
        SELECT u."city" AS city, u."district" AS district, COUNT(*)::bigint AS subscribers
        FROM "PushSubscription" ps
        JOIN "User" u ON u."id" = ps."userId"
        WHERE ps."isActive" = true
        GROUP BY u."city", u."district"
        ORDER BY subscribers DESC
        LIMIT 200
      `),
    ]);

    const delivery = { sent: 0, failed: 0, pending: 0 };
    deliveryGrouped.forEach((g) => {
      delivery[g.status] = g._count;
    });

    const byRegion = regionRows.map((r) => ({
      city: r.city,
      district: r.district,
      subscribers: Number(r.subscribers),
    }));

    return ok({
      totals: {
        users: totalUsers,
        activeSubscriptions,
        inactiveSubscriptions,
        totalSubscriptions,
        announcements: totalAnnouncements,
      },
      delivery,
      byRegion,
    });
  } catch (err) {
    return handleError(err);
  }
}
