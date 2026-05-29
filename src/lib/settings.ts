import { prisma } from './prisma';

export const SETTING_KEYS = {
  senderRateLimitPerMin: 'sender_rate_limit_per_min',
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.senderRateLimitPerMin]: '3',
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Göndericinin dakikada gönderebileceği maksimum duyuru sayısı (admin düzenleyebilir).
export async function getSenderRateLimitPerMin(): Promise<number> {
  const raw = await getSetting(SETTING_KEYS.senderRateLimitPerMin);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}
