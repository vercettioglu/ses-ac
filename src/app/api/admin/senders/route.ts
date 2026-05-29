import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { senderCreateSchema } from '@/lib/validation';
import { requireSession, loadActor, hashPassword, canManageRegion } from '@/lib/auth';
import {
  assertSingleRegionAdminPerCity,
  parentIdForSenderCities,
  attachOrphanSendersToRegionAdmin,
} from '@/lib/admin-hierarchy';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const senderSelect = {
  id: true,
  name: true,
  senderType: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  permissions: { select: { id: true, city: true, district: true } },
  parent: { select: { id: true, name: true } },
} as const;

// Gönderici/yönetici hesaplarını listele.
export async function GET() {
  try {
    const session = await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
    const actor = await loadActor(session.sub);

    const all = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: senderSelect,
    });

    // REGION_ADMIN sadece yönetebileceği (bölgesindeki) hesapları görür.
    if (actor.role === 'REGION_ADMIN') {
      const perms = actor.permissions.map((p) => ({ city: p.city, district: p.district }));
      const visible = all.filter(
        (u) =>
          u.role === 'SENDER' &&
          u.permissions.length > 0 &&
          u.permissions.every((p) => canManageRegion(actor.role, perms, p.city, p.district)),
      );
      return ok({ senders: visible });
    }

    return ok({ senders: all });
  } catch (err) {
    return handleError(err);
  }
}

// Yeni gönderici/yönetici hesabı oluştur.
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const session = await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
    const actor = await loadActor(session.sub);
    const data = senderCreateSchema.parse(await req.json());

    if (actor.role === 'REGION_ADMIN') {
      // REGION_ADMIN sadece SENDER oluşturabilir
      if (data.role !== 'SENDER') {
        return fail('Bu rolü yalnızca SUPER_ADMIN atayabilir', 403);
      }
      if (data.permissions.length === 0) {
        return fail('En az bir bölge yetkisi gerekli', 422);
      }
      const perms = actor.permissions.map((p) => ({ city: p.city, district: p.district }));
      for (const p of data.permissions) {
        if (!canManageRegion(actor.role, perms, p.city, p.district ?? null)) {
          return fail(`${p.city}${p.district ? ' / ' + p.district : ''} için yetkiniz yok`, 403);
        }
      }
    }

    const email = data.email.toLowerCase();
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) return fail('Bu e-posta zaten kayıtlı', 409);

    // Bölge yöneticisi her zaman il geneli (ilçe yok) ve il başına en fazla 1 tane
    const isRegionAdmin = data.role === 'REGION_ADMIN';
    const permissions = isRegionAdmin
      ? Array.from(new Set(data.permissions.map((p) => p.city))).map((city) => ({ city, district: null as string | null }))
      : data.permissions.map((p) => ({
          city: p.city,
          district: p.district && p.district.trim() ? p.district.trim() : null,
        }));
    const cities = permissions.map((p) => p.city);

    if (isRegionAdmin) {
      await assertSingleRegionAdminPerCity(cities);
    }

    // Gönderici, ilinin bölge yöneticisine bağlanır
    const parentId = data.role === 'SENDER' ? await parentIdForSenderCities(cities) : null;

    const passwordHash = await hashPassword(data.password);
    const sender = await prisma.adminUser.create({
      data: {
        name: data.name,
        senderType: data.senderType,
        email,
        passwordHash,
        role: data.role,
        parentId,
        permissions: { create: permissions },
      },
      select: senderSelect,
    });

    // Yeni bölge yöneticisi → o ildeki sahipsiz göndericileri ona bağla
    if (isRegionAdmin) {
      await attachOrphanSendersToRegionAdmin(cities, sender.id);
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'sender.create',
      targetType: 'AdminUser',
      targetId: sender.id,
      meta: { email, role: data.role, permissions: data.permissions },
    });

    return ok({ sender });
  } catch (err) {
    return handleError(err);
  }
}
