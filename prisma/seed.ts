import { PrismaClient, type Role, type SenderType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nextId } from '../src/lib/snowflake';

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD || 'SesAc!2025';

const REGIONS: { city: string; district: string | null }[] = [
  { city: 'Antalya', district: null },
  { city: 'Antalya', district: 'Konyaaltı' },
  { city: 'Antalya', district: 'Muratpaşa' },
  { city: 'Antalya', district: 'Kepez' },
  { city: 'İstanbul', district: null },
  { city: 'İstanbul', district: 'Kadıköy' },
  { city: 'İstanbul', district: 'Beşiktaş' },
  { city: 'Ankara', district: null },
  { city: 'Ankara', district: 'Çankaya' },
];

async function upsertAdmin(opts: {
  name: string;
  email: string;
  role: Role;
  senderType: SenderType;
  permissions: { city: string; district: string | null }[];
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.adminUser.upsert({
    where: { email: opts.email },
    update: { name: opts.name, role: opts.role, senderType: opts.senderType, isActive: true },
    create: {
      name: opts.name,
      email: opts.email,
      role: opts.role,
      senderType: opts.senderType,
      passwordHash,
    },
  });
  // Yetkileri tazele
  await prisma.senderPermission.deleteMany({ where: { adminUserId: user.id } });
  if (opts.permissions.length > 0) {
    await prisma.senderPermission.createMany({
      data: opts.permissions.map((p) => ({ adminUserId: user.id, city: p.city, district: p.district })),
    });
  }
  return user;
}

async function main() {
  console.log('Seed başlıyor…');

  // ---- Bölgeler ----
  for (const r of REGIONS) {
    const existing = await prisma.region.findFirst({ where: { city: r.city, district: r.district } });
    if (!existing) await prisma.region.create({ data: r });
  }
  console.log(`  ✓ ${REGIONS.length} bölge`);

  // ---- Yönetici / gönderici hesapları ----
  const superAdmin = await upsertAdmin({
    name: 'Sistem Yöneticisi',
    email: 'superadmin@ses.ac',
    role: 'SUPER_ADMIN',
    senderType: 'INDIVIDUAL',
    permissions: [],
  });
  // Bölge yöneticisi aynı zamanda gönderici (kurumsal) olabilir
  const regionAdmin = await upsertAdmin({
    name: 'Antalya İl Duyuru Ekibi',
    email: 'antalya.admin@ses.ac',
    role: 'REGION_ADMIN',
    senderType: 'ORGANIZATION',
    permissions: [{ city: 'Antalya', district: null }],
  });
  const sender = await upsertAdmin({
    name: 'Konyaaltı Duyuru Ekibi',
    email: 'konyaalti.sender@ses.ac',
    role: 'SENDER',
    senderType: 'ORGANIZATION',
    permissions: [{ city: 'Antalya', district: 'Konyaaltı' }],
  });
  // Hiyerarşi: Konyaaltı göndericisi, Antalya bölge yöneticisine bağlı
  await prisma.adminUser.update({
    where: { id: sender.id },
    data: { parentId: regionAdmin.id },
  });
  console.log('  ✓ 3 hesap (SUPER_ADMIN, REGION_ADMIN, SENDER) + hiyerarşi');

  // ---- Örnek kullanıcılar (yalnızca boşsa) ----
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        { name: 'Ayşe K.', city: 'Antalya', district: 'Konyaaltı', wantsNational: true, consentAccepted: true },
        { name: null, city: 'Antalya', district: 'Konyaaltı', wantsNational: false, consentAccepted: true },
        { name: 'Mehmet T.', city: 'Antalya', district: 'Muratpaşa', wantsNational: true, consentAccepted: true },
        { name: 'Zeynep A.', city: 'İstanbul', district: 'Kadıköy', wantsNational: true, consentAccepted: true },
        { name: null, city: 'Ankara', district: 'Çankaya', wantsNational: false, consentAccepted: true },
      ],
    });
    console.log('  ✓ 5 örnek kullanıcı');
  } else {
    console.log(`  • ${userCount} kullanıcı zaten var, atlandı`);
  }

  // ---- Örnek duyurular (yalnızca boşsa) ----
  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.announcement.create({
      data: {
        publicId: nextId(),
        title: 'Ülke geneli duyuru testi',
        body: 'Tüm Türkiye duyurularını açan kullanıcılara gönderilen örnek bir duyurudur.',
        isNational: true,
        createdById: superAdmin.id,
        senderName: superAdmin.name,
      },
    });
    await prisma.announcement.create({
      data: {
        publicId: nextId(),
        title: 'Antalya geneli bilgilendirme',
        body: 'Antalya ilindeki tüm kullanıcılara yönelik örnek bir il duyurusudur.',
        city: 'Antalya',
        createdById: regionAdmin.id,
        senderName: regionAdmin.name,
      },
    });
    await prisma.announcement.create({
      data: {
        publicId: nextId(),
        title: 'Konyaaltı sahil etkinliği',
        body: 'Konyaaltı ilçesindeki kullanıcılara özel örnek bir ilçe duyurusudur.',
        city: 'Antalya',
        district: 'Konyaaltı',
        createdById: sender.id,
        senderName: sender.name,
      },
    });
    // 24 saatten eski → feed'de silik görünmesi beklenir
    await prisma.announcement.create({
      data: {
        publicId: nextId(),
        title: 'Eski duyuru (2 gün önce)',
        body: 'Bu duyuru 24 saatten eski olduğu için akışta daha silik görünür ama silinmez.',
        city: 'Antalya',
        district: 'Konyaaltı',
        createdById: sender.id,
        senderName: sender.name,
        createdAt: twoDaysAgo,
      },
    });
    console.log('  ✓ 4 örnek duyuru (biri 24s+ eski)');
  } else {
    console.log(`  • ${annCount} duyuru zaten var, atlandı`);
  }

  // Eksik publicId'leri tamamla (eski/mevcut duyurular sayısal URL alsın)
  const missing = await prisma.announcement.findMany({
    where: { publicId: null },
    select: { id: true },
  });
  for (const a of missing) {
    await prisma.announcement.update({ where: { id: a.id }, data: { publicId: nextId() } });
  }
  if (missing.length) console.log(`  ✓ ${missing.length} duyuruya sayısal kimlik atandı`);

  console.log('\nSeed tamamlandı. Giriş bilgileri:');
  console.log('  SUPER_ADMIN : superadmin@ses.ac');
  console.log('  REGION_ADMIN: antalya.admin@ses.ac');
  console.log('  SENDER      : konyaalti.sender@ses.ac');
  console.log(`  Şifre (hepsi): ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
