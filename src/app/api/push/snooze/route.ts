import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { snoozeSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bildirimleri belirli bir süre sessize alır (abonelik kapatılmaz, sadece bu süre gönderim yapılmaz).
// hours=0 → sessizliği kaldırır.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { userId, hours } = snoozeSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return fail('Kullanıcı bulunamadı', 404);

    const mutedUntil = hours > 0 ? new Date(Date.now() + hours * 3600 * 1000) : null;
    await prisma.user.update({ where: { id: userId }, data: { mutedUntil } });

    return ok({ mutedUntil: mutedUntil ? mutedUntil.toISOString() : null });
  } catch (err) {
    return handleError(err);
  }
}
