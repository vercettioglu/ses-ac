'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { apiPost } from '@/lib/client/api';

export function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        try {
          await apiPost('/api/auth/logout');
        } catch {
          /* yoksay */
        }
        router.replace(redirectTo);
        router.refresh();
      }}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      Çıkış
    </button>
  );
}
