import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/panel/login');

  const nav: NavItem[] = [
    { href: '/panel', label: 'Yeni Duyuru' },
    { href: '/panel/history', label: 'Geçmiş' },
  ];
  // Bölge yöneticisi / süper yönetici aynı zamanda yöneticidir → panele dönüş bağlantısı
  if (session.role !== 'SENDER') {
    nav.push({ href: '/admin', label: 'Yönetim' });
  }

  return (
    <DashboardShell
      brand="Ses Aç · Gönderici"
      items={nav}
      name={session.name}
      role={session.role}
      logoutRedirect="/panel/login"
    >
      {children}
    </DashboardShell>
  );
}
