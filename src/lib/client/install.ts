// Android (Chromium) tek-tık "Ana Ekrana Ekle" akışı: beforeinstallprompt yakalanır,
// kullanıcı butona basınca sistem kurulum penceresi açılır.
// iOS'ta bu olay YOK (Apple desteklemiyor) → orada manuel Safari rehberi kullanılır.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let inited = false;

// Olay erken tetiklenebildiği için mümkün olduğunca erken çağrılmalı (layout mount).
export function initInstallCapture() {
  if (typeof window === 'undefined' || inited) return;
  inited = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
  });
}

export function canInstall(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') deferred = null;
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}
