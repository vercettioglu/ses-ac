import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { forgotPasswordSchema } from '@/lib/validation';
import { sendMail, brandedHtml } from '@/lib/mail';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Şifre sıfırlama isteği. Token üretilir, yalnızca SHA-256 özeti saklanır, ham token
// e-postayla gönderilir. E-posta sızıntısını/enumerasyonu önlemek için yanıt her zaman ok.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { email } = forgotPasswordSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user && user.passwordHash) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli

      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expires },
      });

      const link = `${env.appUrl}/sifre-sifirla?token=${token}`;
      await sendMail({
        to: user.email!,
        subject: 'Susma şifre sıfırlama',
        text:
          `Şifrenizi sıfırlamak için bağlantı:\n${link}\n\n` +
          'Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız yok sayın.\n\nSusma',
        html: brandedHtml({
          heading: 'Şifre sıfırlama',
          bodyHtml:
            '<p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bağlantı ' +
            '<strong>1 saat</strong> geçerlidir.</p>' +
            `<p><a href="${link}" style="display:inline-block;background:#d8392b;color:#fff;` +
            'text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Şifremi sıfırla</a></p>' +
            `<p style="color:#64748b;font-size:13px">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>${link}</p>`,
        }),
      });
    }

    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
