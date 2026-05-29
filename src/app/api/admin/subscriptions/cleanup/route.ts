import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { requireSession, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sorunlu/expired (pasif) push aboneliklerini temizler.
// İlgili DeliveryLog kayıtları korunur (FK SetNull).
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
    const session = await getSession();

    const result = await prisma.pushSubscription.deleteMany({ where: { isActive: false } });

    await logAudit({
      actorId: session?.sub,
      actorEmail: session?.email,
      action: 'subscription.cleanup',
      meta: { deleted: result.count },
    });

    return ok({ deleted: result.count });
  } catch (err) {
    return handleError(err);
  }
}
