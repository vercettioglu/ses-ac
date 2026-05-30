import { NextRequest } from 'next/server';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { clearMemberSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Üye çıkışı: yalnızca oturum cookie'sini temizler. İstemci localStorage'ı silip
// bölge seçim ekranına döner. (Push aboneliği bir sonraki kayıt/girişte yeniden bağlanır.)
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    clearMemberSessionCookie();
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
