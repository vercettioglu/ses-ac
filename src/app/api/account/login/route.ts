import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { accountLoginSchema } from '@/lib/validation';
import { verifyPassword, signMemberSession, setMemberSessionCookie } from '@/lib/auth';
import { publicUser } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Üye girişi. Başarılı olursa cihazın push aboneliği (endpoint) bu hesaba bağlanır
// → "abonelik geçmişi son giriş yapılan hesapla eşleşir".
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { email, password, endpoint } = accountLoginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Zamanlama sızıntısını azaltmak için kullanıcı yoksa da karşılaştırma yapılır.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const valid = await verifyPassword(password, hash);

    if (!user || !user.passwordHash || !valid) {
      return fail('E-posta veya şifre hatalı', 401);
    }

    // Bu cihazın mevcut aboneliğini giriş yapılan hesaba taşı (varsa).
    if (endpoint) {
      await prisma.pushSubscription.updateMany({
        where: { endpoint },
        data: { userId: user.id, isActive: true },
      });
    }

    const token = await signMemberSession({ sub: user.id, email: user.email! });
    setMemberSessionCookie(token);

    return ok({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
