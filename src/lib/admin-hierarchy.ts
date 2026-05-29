import 'server-only';
import { prisma } from './prisma';
import { HttpError } from './http';

// Bir ilin aktif bölge yöneticisinin (REGION_ADMIN, il geneli yetkili) id'si.
export async function regionAdminIdForCity(
  city: string,
  excludeId?: string,
): Promise<string | null> {
  const admin = await prisma.adminUser.findFirst({
    where: {
      role: 'REGION_ADMIN',
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined,
      permissions: { some: { city, district: null } },
    },
    select: { id: true },
  });
  return admin?.id ?? null;
}

// İl başına en fazla 1 bölge yöneticisi kuralını uygular.
export async function assertSingleRegionAdminPerCity(
  cities: string[],
  excludeId?: string,
): Promise<void> {
  for (const city of Array.from(new Set(cities))) {
    const existing = await regionAdminIdForCity(city, excludeId);
    if (existing) {
      throw new HttpError(`${city} için zaten bir bölge yöneticisi var. Her il için en fazla bir bölge yöneticisi olabilir.`, 409);
    }
  }
}

// Bir göndericinin bağlı olacağı bölge yöneticisi: illerinden ilkinin yöneticisi.
export async function parentIdForSenderCities(cities: string[]): Promise<string | null> {
  for (const city of cities) {
    const id = await regionAdminIdForCity(city);
    if (id) return id;
  }
  return null;
}

// Yeni bir bölge yöneticisi açılınca, o ildeki sahipsiz göndericileri ona bağlar.
export async function attachOrphanSendersToRegionAdmin(
  cities: string[],
  regionAdminId: string,
): Promise<void> {
  for (const city of Array.from(new Set(cities))) {
    const senders = await prisma.senderPermission.findMany({
      where: { city, adminUser: { role: 'SENDER', parentId: null } },
      select: { adminUserId: true },
      distinct: ['adminUserId'],
    });
    const ids = senders.map((s) => s.adminUserId);
    if (ids.length) {
      await prisma.adminUser.updateMany({
        where: { id: { in: ids } },
        data: { parentId: regionAdminId },
      });
    }
  }
}
