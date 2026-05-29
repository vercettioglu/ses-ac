import { NextRequest } from 'next/server';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { clearSessionCookie, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const session = await getSession();
    clearSessionCookie();
    if (session) {
      await logAudit({ actorId: session.sub, actorEmail: session.email, action: 'auth.logout' });
    }
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
