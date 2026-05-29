import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { registerSchema } from '@/lib/validation';
import { normalizeTrMobile } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ön kayıt: il/ilçe + ulusal tercih + onay. Üyelik bilgileri (ad/iletişim) opsiyonel.
// userId verilirse mevcut kayıt güncellenir (cihaz tekrar kayıt olunca duplicate olmaz).
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const data = registerSchema.parse(await req.json());
    const district = data.district && data.district.trim() ? data.district.trim() : null;
    const name = data.name && data.name.trim() ? data.name.trim() : null;
    // contact yalnızca TR cep telefonu (zod doğruladı) → kanonik forma normalize et
    const phone = data.contact && data.contact.trim() ? normalizeTrMobile(data.contact.trim()) : null;
    const occupation = data.occupation && data.occupation.trim() ? data.occupation.trim() : null;
    const age = data.age ?? null;
    const gender = data.gender ?? null;

    const profile = {
      name,
      contact: phone,
      age,
      gender,
      occupation,
      city: data.city,
      district,
      wantsNational: data.wantsNational,
      consentAccepted: data.consentAccepted,
    };

    let user = null;
    if (data.userId) {
      const existing = await prisma.user.findUnique({ where: { id: data.userId } });
      if (existing) {
        // Ayarlar formu profilin tamamını gönderir → doğrudan güncellenir (boşaltmaya da izin verir)
        user = await prisma.user.update({ where: { id: existing.id }, data: profile });
      }
    }

    if (!user) {
      user = await prisma.user.create({ data: profile });
    }

    return ok({
      userId: user.id,
      city: user.city,
      district: user.district,
      wantsNational: user.wantsNational,
      hasMembership: Boolean(user.name || user.contact),
    });
  } catch (err) {
    return handleError(err);
  }
}
