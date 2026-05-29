import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { loginSchema } from '@/lib/validation';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin ve gönderici ortak giriş ucu. Rol yanıtta döner; istemci role göre yönlendirir.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { email, password } = loginSchema.parse(await req.json());
    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });

    // Zamanlama sızıntısını azaltmak için kullanıcı yoksa da karşılaştırma yapılır.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const valid = await verifyPassword(password, hash);

    if (!user || !user.isActive || !valid) {
      return fail('E-posta veya şifre hatalı', 401);
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setSessionCookie(token);
    await logAudit({ actorId: user.id, actorEmail: user.email, action: 'auth.login' });

    return ok({ role: user.role, name: user.name });
  } catch (err) {
    return handleError(err);
  }
}
