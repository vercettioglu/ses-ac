import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { unsubscribeSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Aboneliği pasifleştirir (kullanıcı bildirimleri kapatınca).
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { endpoint } = unsubscribeSchema.parse(await req.json());
    await prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { isActive: false },
    });
    return ok({ unsubscribed: true });
  } catch (err) {
    return handleError(err);
  }
}
