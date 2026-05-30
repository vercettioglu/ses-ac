// Son kullanıcı (üye) hesap akışı: üye olma, giriş, çıkış.
// Anonim cihaz kimliğinin üstüne opsiyonel e-posta+şifre hesabı ekler.

import { apiPost } from './api';
import { getLocalUser, setLocalUser, clearLocalUser } from './storage';
import { getEndpoint, disablePush } from './push-client';

export type AccountUser = {
  userId: string;
  email: string | null;
  name: string | null;
  contact: string | null;
  age: number | null;
  gender: 'FEMALE' | 'MALE' | 'UNSPECIFIED' | null;
  occupation: string | null;
  city: string;
  district: string | null;
  wantsNational: boolean;
  mutedUntil: string | null;
};

// Dönen hesabı localStorage kimliğine yazar (feed/abonelik bunu kullanır).
function applyUser(u: AccountUser, extra?: { notificationsEnabled?: boolean }) {
  setLocalUser({
    userId: u.userId,
    email: u.email ?? undefined,
    name: u.name ?? undefined,
    contact: u.contact ?? undefined,
    age: u.age,
    gender: u.gender,
    occupation: u.occupation,
    city: u.city,
    district: u.district,
    wantsNational: u.wantsNational,
    consentAccepted: true,
    mutedUntil: u.mutedUntil,
    ...extra,
  });
}

// Üye ol: mevcut cihaz kullanıcısını (varsa) e-posta+şifreyle yükseltir.
export async function registerMember(email: string, password: string): Promise<AccountUser> {
  const local = getLocalUser();
  const res = await apiPost<{ user: AccountUser }>('/api/account/register', {
    userId: local?.userId,
    email,
    password,
    city: local?.city ?? null,
    district: local?.district ?? null,
    wantsNational: local?.wantsNational ?? false,
  });
  // Üye olmak cihazdaki mevcut kimliği değiştirmez; yalnızca e-posta eklenir.
  applyUser(res.user);
  return res.user;
}

// Giriş yap: cihazın mevcut aboneliğini (endpoint) bu hesaba bağlar, kimliği değiştirir.
export async function loginMember(email: string, password: string): Promise<AccountUser> {
  const endpoint = (await getEndpoint()) ?? undefined;
  const res = await apiPost<{ user: AccountUser }>('/api/account/login', {
    email,
    password,
    endpoint,
  });
  // Cihazda canlı abonelik varsa bu hesap için bildirimler açık sayılır.
  applyUser(res.user, endpoint ? { notificationsEnabled: true } : undefined);
  return res.user;
}

// Çıkış yap: oturumu kapatır, cihazın push aboneliğini bu hesaptan ayırır ve yerel
// kimliği siler → kullanıcı bölge seçim ekranına döner. Aboneliği kaldırmak şart:
// aksi halde ana sayfadaki cihaz-kurtarma aynı hesabı geri yükler (çıkış "yapışmaz").
export async function logoutMember(): Promise<void> {
  try {
    await apiPost('/api/account/logout', {});
  } catch {
    /* yoksay — yine de devam et */
  }
  await disablePush();
  clearLocalUser();
}

export function isMember(): boolean {
  return Boolean(getLocalUser()?.email);
}
