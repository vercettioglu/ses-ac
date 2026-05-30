export type PlatformKind = 'ios' | 'android' | 'desktop' | 'unknown';

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ kendini Mac gibi tanıtır:
  const iPadOS =
    navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function detectPlatform(): PlatformKind {
  if (typeof navigator === 'undefined') return 'unknown';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  if (/Windows|Macintosh|Linux|CrOS/i.test(navigator.userAgent || '')) return 'desktop';
  return 'unknown';
}

// Uygulama ana ekrandan (PWA / standalone) mı açıldı?
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as any).standalone === true;
  const mq =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(iosStandalone || mq);
}

// Tarayıcı web push'u destekliyor mu?
export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export type OSKind = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';

export function detectOS(): OSKind {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (isIOS()) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux';
  return 'unknown';
}

// iOS'ta Safari DIŞI bir tarayıcı mı? (Chrome/Firefox/Edge/Opera/DuckDuckGo vb.)
// iOS'ta push'lu "Ana Ekrana Ekle" yalnızca Safari'de güvenilir çalışır.
export function isIosNonSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent || '';
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Mercury/i.test(ua);
}

// Bildirim ayarlarını yönlendirmek için tarayıcı adı (Türkçe yardım metninde kullanılır).
export function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'tarayıcınız';
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Google Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'tarayıcınız';
}
