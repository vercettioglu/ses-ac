import { prisma } from '@/lib/prisma';
import { ok, handleError } from '@/lib/http';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mevcut oturum + yetkili bölgeler (panel/admin arayüzleri bunu kullanır).
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return ok({ authenticated: false });

    const actor = await prisma.adminUser.findUnique({
      where: { id: session.sub },
      include: { permissions: true },
    });
    if (!actor || !actor.isActive) return ok({ authenticated: false });

    return ok({
      authenticated: true,
      user: { id: actor.id, name: actor.name, email: actor.email, role: actor.role },
      permissions: actor.permissions.map((p) => ({ city: p.city, district: p.district })),
    });
  } catch (err) {
    return handleError(err);
  }
}
