import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { resetPasswordSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Token + yeni şifre. Token'ın özeti eşleşmeli ve süresi geçmemiş olmalı.
// Başarıda şifre güncellenir, token tek kullanımlık olarak temizlenir.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { token, password } = resetPasswordSchema.parse(await req.json());
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
    });
    if (!user) {
      return fail('Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden isteyin.', 400);
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
