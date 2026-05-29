import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, handleError, assertSameOrigin } from '@/lib/http';
import { registerSchema } from '@/lib/validation';

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
    const contact = data.contact && data.contact.trim() ? data.contact.trim() : null;

    let user = null;
    if (data.userId) {
      const existing = await prisma.user.findUnique({ where: { id: data.userId } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: name ?? existing.name,
            contact: contact ?? existing.contact,
            city: data.city,
            district,
            wantsNational: data.wantsNational,
            consentAccepted: data.consentAccepted,
          },
        });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          contact,
          city: data.city,
          district,
          wantsNational: data.wantsNational,
          consentAccepted: data.consentAccepted,
        },
      });
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
