import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { accountRegisterSchema } from '@/lib/validation';
import { hashPassword, signMemberSession, setMemberSessionCookie } from '@/lib/auth';
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

    // NOT: Hoş geldin e-postası bir sonraki adımda (nodemailer → yerel Postfix) eklenecek.

    return ok({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
