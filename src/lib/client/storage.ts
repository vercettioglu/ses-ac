// Üye olmayan kullanıcıların seçimleri localStorage'de tutulur.
// Üye olunca da aynı kayıt zenginleşir (ad/iletişim eklenir).

export type Gender = 'FEMALE' | 'MALE' | 'UNSPECIFIED';

export type LocalUser = {
  userId?: string;
  email?: string; // üye ise e-posta (varsa hesap sahibi); yoksa anonim
  name?: string;
  contact?: string; // cep telefonu (TR)
  age?: number | null;
  gender?: Gender | null;
  occupation?: string | null;
  city?: string;
  district?: string | null;
  wantsNational: boolean;
  consentAccepted: boolean;
  notificationsEnabled?: boolean;
  mutedUntil?: string | null; // ISO; bu tarihe kadar bildirimler sessizde
  membershipPromptDismissed?: boolean; // akışta üyelik daveti kapatıldı mı
};

const KEY = 'sesac_user';

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

export function setLocalUser(partial: Partial<LocalUser>): LocalUser {
  const current = getLocalUser() ?? { wantsNational: false, consentAccepted: false };
  const next: LocalUser = { ...current, ...partial };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearLocalUser() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(KEY);
}
