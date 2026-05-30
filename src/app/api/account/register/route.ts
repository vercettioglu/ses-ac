import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { accountRegisterSchema } from '@/lib/validation';
import { hashPassword, signMemberSession, setMemberSessionCookie } from '@/lib/auth';
import { sendMail, brandedHtml } from '@/lib/mail';
import { publicUser } from '../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Üye olma: e-posta + şifre belirler. Mevcut cihaz kullanıcısı (userId) varsa
// o anonim kayıt "yükseltilir" (bölge/abonelik korunur); yoksa bölgeyle yeni üye açılır.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const data = accountRegisterSchema.parse(await req.json());
    const email = data.email.toLowerCase();

    // E-posta başka bir kullanıcıda kayıtlı mı?
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail && existingByEmail.id !== data.userId) {
      return fail('Bu e-posta zaten kayıtlı. Giriş yapın.', 409);
    }

    const passwordHash = await hashPassword(data.password);

    let user = null;
    if (data.userId) {
      const existing = await prisma.user.findUnique({ where: { id: data.userId } });
      if (existing) {
        // Yalnızca anonim (şifresiz) kayıt üyeliğe yükseltilebilir. Halihazırda üye
        // olan bir kaydın kimlik bilgileri bu uçtan değiştirilemez (hesap ele geçirme önlemi).
        if (existing.passwordHash) {
          return fail('Bu hesap zaten üye. Lütfen giriş yapın.', 409);
        }
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { email, passwordHash, consentAccepted: true },
        });
      }
    }

    if (!user) {
      // Cihaz kaydı yoksa üyelik için en azından bir bölge gerekir.
      const city = data.city?.trim();
      if (!city) return fail('Önce bölgenizi seçin.', 400);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          city,
          district: data.district?.trim() || null,
          wantsNational: data.wantsNational ?? false,
          consentAccepted: true,
        },
      });
    }

    const token = await signMemberSession({ sub: user.id, email });
    setMemberSessionCookie(token);

    // Hoş geldin e-postası (best-effort; başarısız olsa da üyelik tamamlanır).
    await sendMail({
      to: email,
      subject: 'Susma’ya hoş geldiniz',
      text:
        'Susma üyeliğiniz oluşturuldu.\n\n' +
        'Artık başka bir cihazdan giriş yapıp bölgenize ulaşabilir, şifrenizi unutursanız ' +
        'e-postayla sıfırlayabilirsiniz.\n\n' +
        'Duyurularınız: https://susma.org/feed\n\nSusma',
      html: brandedHtml({
        heading: 'Üyeliğiniz oluşturuldu',
        bodyHtml:
          '<p>Susma üyeliğiniz oluşturuldu. Artık başka bir cihazdan giriş yapıp bölgenize ' +
          'ulaşabilir, şifrenizi unutursanız e-postayla sıfırlayabilirsiniz.</p>' +
          '<p><a href="https://susma.org/feed" style="display:inline-block;background:#d8392b;color:#fff;' +
          'text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Duyurularımı gör</a></p>',
      }),
    });

    return ok({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
