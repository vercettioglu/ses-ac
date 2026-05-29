import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { unsubscribeSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cihaz kurtarma: tarayıcının mevcut push endpoint'inden, daha önce kaydedilmiş
// kullanıcıyı (ad/telefon/bölge) bulur. localStorage silinse bile aynı cihazı eski
// kaydına bağlar. Güvenlik: endpoint yalnızca o tarayıcının bildiği gizli bir değerdir.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { endpoint } = unsubscribeSchema.parse(await req.json());

    const sub = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      include: { user: true },
    });

    if (!sub || !sub.user) return ok({ found: false });

    // Tarayıcı bu endpoint'i canlı abonelik olarak sunduğu için yeniden aktifleştir.
    if (!sub.isActive) {
      await prisma.pushSubscription.update({ where: { id: sub.id }, data: { isActive: true } });
    }

    const u = sub.user;
    return ok({
      found: true,
      user: {
        userId: u.id,
        name: u.name,
        contact: u.contact,
        city: u.city,
        district: u.district,
        wantsNational: u.wantsNational,
        mutedUntil: u.mutedUntil ? u.mutedUntil.toISOString() : null,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
