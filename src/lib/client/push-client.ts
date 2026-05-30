import { detectPlatform, pushSupported } from './platform';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  // ArrayBuffer üzerinden kur → applicationServerKey (BufferSource) ile uyumlu.
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'error'; message: string };

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/push/public-key', { cache: 'no-store' });
  const json = await res.json();
  const key = json?.data?.publicKey;
  if (!key) throw new Error('Sunucu anahtarı alınamadı');
  return key;
}

// Bildirim iznini ister ve push aboneliğini sunucuya kaydeder.
export async function enablePush(userId: string): Promise<EnableResult> {
  if (!pushSupported()) {
    return { ok: false, reason: 'unsupported', message: 'Bu cihaz/tarayıcı bildirimleri desteklemiyor.' };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied', message: 'Bildirim izni verilmedi.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const publicKey = await getVapidPublicKey();

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        platform: detectPlatform(),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, reason: 'error', message: j?.error || 'Kayıt başarısız.' };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Beklenmeyen hata.',
    };
  }
}

// Aboneliği kaldırır (cihazda + sunucuda pasifleştirir).
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }
  } catch {
    /* yoksay */
  }
}

export type RecoveredUser = {
  userId: string;
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

// localStorage silinmişse, tarayıcının mevcut push aboneliğinden (endpoint) eski
// kullanıcı kaydını geri bulur. Başarısız/yavaşsa null döner (akışı bloklamaz).
export async function recoverFromDevice(timeoutMs = 2500): Promise<RecoveredUser | null> {
  if (!pushSupported()) return null;

  const work = (async (): Promise<RecoveredUser | null> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return null;
      const res = await fetch('/api/push/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data?.found ? (json.data.user as RecoveredUser) : null;
    } catch {
      return null;
    }
  })();

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([work, timeout]);
}

// Cihaz üzerinde yerel bir bildirim gösterir (gerçek push beklemeden OS gösterimini test eder).
// OS/tarayıcı bildirimi engelliyorsa kullanıcı bunu hemen fark eder.
export async function showLocalNotification(title: string, body: string): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    if (Notification.permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'susma-local-test',
      data: { url: '/feed' },
    });
    return true;
  } catch {
    return false;
  }
}

// Akış görüntülenince uygulama ikonundaki okunmamış rozetini temizler.
export async function clearBadge(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
      await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  } catch {
    /* yoksay */
  }
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'clear-badge' });
  } catch {
    /* yoksay */
  }
}

export async function hasActiveSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}
