import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError } from '@/lib/http';
import { isNumericId } from '@/lib/snowflake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tek duyuru detayı (public). Bildirime tıklayınca /a/[id] bunu çağırır.
// id sayısal ise publicId ile, değilse (eski linkler) iç CUID ile aranır.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idParam = params.id;
    const announcement = await prisma.announcement.findFirst({
      where: isNumericId(idParam) ? { publicId: idParam } : { id: idParam },
      select: {
        id: true,
        publicId: true,
        title: true,
        body: true,
        city: true,
        district: true,
        isNational: true,
        senderName: true,
        createdAt: true,
        // Güncel gönderici adı (rename sonrası güncellenir)
        createdBy: { select: { name: true } },
      },
    });
    if (!announcement) return fail('Duyuru bulunamadı', 404);

    const { publicId, createdBy, senderName, ...rest } = announcement;
    return ok({
      announcement: {
        ...rest,
        id: publicId ?? announcement.id,
        senderName: createdBy?.name ?? senderName ?? null,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
