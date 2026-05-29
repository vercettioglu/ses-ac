import { NextRequest } from 'next/server';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { requireSession, getSession } from '@/lib/auth';
import { settingsSchema } from '@/lib/validation';
import { SETTING_KEYS, getSenderRateLimitPerMin, setSetting } from '@/lib/settings';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mevcut ayarlar.
export async function GET() {
  try {
    await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
    return ok({ senderRateLimitPerMin: await getSenderRateLimitPerMin() });
  } catch (err) {
    return handleError(err);
  }
}

// Ayar güncelle (yalnızca SUPER_ADMIN).
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireSession(['SUPER_ADMIN']);
    const session = await getSession();
    const data = settingsSchema.parse(await req.json());
    await setSetting(SETTING_KEYS.senderRateLimitPerMin, String(data.senderRateLimitPerMin));
    await logAudit({
      actorId: session?.sub,
      actorEmail: session?.email,
      action: 'settings.update',
      meta: { senderRateLimitPerMin: data.senderRateLimitPerMin },
    });
    return ok({ senderRateLimitPerMin: data.senderRateLimitPerMin });
  } catch (err) {
    return handleError(err);
  }
}
