import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/panel/login');

  // İsim/rol güncel olsun diye JWT yerine DB'den oku
  const actor = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { name: true, role: true, isActive: true },
  });
  if (!actor || !actor.isActive) redirect('/panel/login');

  const nav: NavItem[] = [
    { href: '/panel', label: 'Yeni Duyuru' },
    { href: '/panel/history', label: 'Geçmiş' },
  ];
  // Bölge yöneticisi / süper yönetici aynı zamanda yöneticidir → yönetime dönüş bağlantısı
  if (actor.role !== 'SENDER') {
    nav.push({ href: '/admin', label: 'Yönetim' });
  }

  return (
    <DashboardShell
      brand="Susma · Gönderici"
      items={nav}
      name={actor.name}
      role={actor.role}
      logoutRedirect="/panel/login"
    >
      {children}
    </DashboardShell>
  );
}
