import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
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
  if (session.role === 'SENDER') redirect('/panel');

  return (
    <DashboardShell
      brand="Ses Aç · Yönetim"
      items={NAV}
      name={session.name}
      role={session.role}
      logoutRedirect="/admin/login"
    >
      {children}
    </DashboardShell>
  );
}
