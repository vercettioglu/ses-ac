'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/logout-button';

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Süper Yönetici',
  REGION_ADMIN: 'Bölge Yöneticisi',
  SENDER: 'Gönderici',
};

export type NavItem = { href: string; label: string };

export function DashboardShell({
  brand,
  items,
  name,
  role,
  logoutRedirect,
  children,
}: {
  brand: string;
  items: NavItem[];
  name: string;
  role: Role;
  logoutRedirect: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="container flex h-14 max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Megaphone className="h-5 w-5" />
            </span>
            <span>{brand}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-none">{name}</div>
              <div className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
            </div>
            <LogoutButton redirectTo={logoutRedirect} />
          </div>
        </div>
        {items.length > 1 && (
          <nav className="container flex max-w-3xl gap-1 overflow-x-auto pb-2">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="container max-w-3xl py-6">{children}</main>
    </div>
  );
}
