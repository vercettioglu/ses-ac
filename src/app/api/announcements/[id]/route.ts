import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tek duyuru detayı (public). Bildirime tıklayınca /a/[id] bunu çağırır.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        body: true,
        city: true,
        district: true,
        isNational: true,
        senderName: true,
        createdAt: true,
      },
    });
    if (!announcement) return fail('Duyuru bulunamadı', 404);
    return ok({ announcement });
  } catch (err) {
    return handleError(err);
  }
}
