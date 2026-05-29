import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handleError, assertSameOrigin } from '@/lib/http';
import { senderUpdateSchema } from '@/lib/validation';
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

// Gönderici hesabını güncelle: pasifleştir, rol/şifre/bölge değiştir.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertSameOrigin(req);
    const session = await requireSession(['SUPER_ADMIN', 'REGION_ADMIN']);
    const actor = await loadActor(session.sub);
    const data = senderUpdateSchema.parse(await req.json());

    const target = await prisma.adminUser.findUnique({
      where: { id: params.id },
      include: { permissions: true },
    });
    if (!target) return fail('Hesap bulunamadı', 404);

    // Kendini pasifleştirme/kilitlenme önlemi
    if (target.id === actor.id && data.isActive === false) {
      return fail('Kendi hesabınızı pasifleştiremezsiniz', 400);
    }

    const actorPerms = actor.permissions.map((p) => ({ city: p.city, district: p.district }));

    if (actor.role === 'REGION_ADMIN') {
      if (target.role !== 'SENDER') {
        return fail('Bu hesabı yönetme yetkiniz yok', 403);
      }
      const manageable = target.permissions.every((p) =>
        canManageRegion(actor.role, actorPerms, p.city, p.district),
      );
      if (!manageable) return fail('Bu hesabı yönetme yetkiniz yok', 403);
      if (data.role && data.role !== 'SENDER') {
        return fail('Rol değiştirme yetkiniz yok', 403);
      }
      if (data.permissions) {
        for (const p of data.permissions) {
          if (!canManageRegion(actor.role, actorPerms, p.city, p.district ?? null)) {
            return fail(`${p.city}${p.district ? ' / ' + p.district : ''} için yetkiniz yok`, 403);
          }
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (data.senderType) updateData.senderType = data.senderType;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.role && actor.role === 'SUPER_ADMIN') updateData.role = data.role;
    if (data.password) updateData.passwordHash = await hashPassword(data.password);

    // Güncelleme sonrası geçerli rol
    const effectiveRole = data.role && actor.role === 'SUPER_ADMIN' ? data.role : target.role;

    // Bölge yetkileri ve hiyerarşi (yalnızca permissions gönderildiyse)
    let newPermissions: { city: string; district: string | null }[] | null = null;
    let cities: string[] = [];
    if (data.permissions) {
      if (effectiveRole === 'REGION_ADMIN') {
        // İl geneli zorunlu + il başına 1 bölge yöneticisi
        newPermissions = Array.from(new Set(data.permissions.map((p) => p.city))).map((city) => ({
          city,
          district: null,
        }));
        cities = newPermissions.map((p) => p.city);
        await assertSingleRegionAdminPerCity(cities, target.id);
        updateData.parentId = null;
      } else if (effectiveRole === 'SENDER') {
        newPermissions = data.permissions.map((p) => ({
          city: p.city,
          district: p.district && p.district.trim() ? p.district.trim() : null,
        }));
        cities = newPermissions.map((p) => p.city);
        updateData.parentId = await parentIdForSenderCities(cities);
      } else {
        // SUPER_ADMIN: yetki yok
        newPermissions = [];
        updateData.parentId = null;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (newPermissions) {
        await tx.senderPermission.deleteMany({ where: { adminUserId: target.id } });
        if (newPermissions.length > 0) {
          await tx.senderPermission.createMany({
            data: newPermissions.map((p) => ({
              adminUserId: target.id,
              city: p.city,
              district: p.district,
            })),
          });
        }
      }
      return tx.adminUser.update({
        where: { id: target.id },
        data: updateData,
        select: senderSelect,
      });
    });

    // Bölge yöneticisi olduysa, illerindeki sahipsiz göndericileri bağla
    if (newPermissions && effectiveRole === 'REGION_ADMIN') {
      await attachOrphanSendersToRegionAdmin(cities, target.id);
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: data.isActive === false ? 'sender.deactivate' : 'sender.update',
      targetType: 'AdminUser',
      targetId: target.id,
      meta: {
        changedName: data.name !== undefined,
        changedPassword: Boolean(data.password),
        changedRole: Boolean(data.role),
        changedPermissions: Boolean(data.permissions),
        isActive: data.isActive,
      },
    });

    return ok({ sender: updated });
  } catch (err) {
    return handleError(err);
  }
}
