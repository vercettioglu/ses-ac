import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { subscribeSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Push aboneliğini kaydeder. endpoint benzersiz → tekrar kayıtta upsert (duplicate yok).
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const data = subscribeSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return fail('Kullanıcı bulunamadı. Önce bölge kaydı yapın.', 404);

    const { endpoint, keys } = data.subscription;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: data.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: data.userAgent,
        platform: data.platform,
        isActive: true,
      },
      create: {
        userId: data.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: data.userAgent,
        platform: data.platform,
        isActive: true,
      },
    });

    return ok({ subscribed: true });
  } catch (err) {
    return handleError(err);
  }
}
