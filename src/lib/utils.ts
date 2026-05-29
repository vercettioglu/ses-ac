import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "2 saat önce" tarzı göreli zaman (Türkçe).
export function timeAgoTr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'az önce';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dakika önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} gün önce`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} ay önce`;
  const year = Math.floor(month / 12);
  return `${year} yıl önce`;
}

export function isOlderThan24h(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Date.now() - d.getTime() > 24 * 60 * 60 * 1000;
}
