import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Özet' },
  { href: '/admin/senders', label: 'Göndericiler' },
  { href: '/admin/announcements', label: 'Duyurular' },
  { href: '/admin/subscribers', label: 'Aboneler' },
  // Yöneticiler aynı zamanda gönderici olabilir
  { href: '/panel', label: 'Duyuru Gönder' },
];

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  // İsim/rol güncel olsun diye JWT yerine DB'den oku
  const actor = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { name: true, role: true, isActive: true },
  });
  if (!actor || !actor.isActive) redirect('/admin/login');
  if (actor.role === 'SENDER') redirect('/panel');

  return (
    <DashboardShell
      brand="Ses Aç · Yönetim"
      items={NAV}
      name={actor.name}
      role={actor.role}
      logoutRedirect="/admin/login"
    >
      {children}
    </DashboardShell>
  );
}
