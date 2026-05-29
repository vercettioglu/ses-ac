import { ok, fail } from '@/lib/http';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// İstemcinin push aboneliği için ihtiyaç duyduğu VAPID public anahtarı.
export async function GET() {
  if (!env.vapidPublicKey) {
    return fail('Sunucu push için yapılandırılmamış (VAPID anahtarı yok).', 503);
  }
  return ok({ publicKey: env.vapidPublicKey });
}
