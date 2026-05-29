'use client';

import { useEffect, useState } from 'react';
import { apiGet } from './api';
import type { Role } from '@prisma/client';

export type SessionPermission = { city: string; district: string | null };

export type SessionInfo = {
  authenticated: boolean;
  user?: { id: string; name: string; email: string; role: Role };
  permissions?: SessionPermission[];
};

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    apiGet<SessionInfo>('/api/auth/session')
      .then(setSession)
      .catch(() => setSession({ authenticated: false }));
  }, []);

  return session;
}
