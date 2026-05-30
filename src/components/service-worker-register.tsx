'use client';

import { useEffect } from 'react';
import { initInstallCapture } from '@/lib/client/install';

// Service worker'ı kök kapsamda kaydeder. Push aboneliği bu kayda dayanır.
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Android tek-tık kurulum için beforeinstallprompt'u erken yakala
    initInstallCapture();
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('Service worker kaydı başarısız:', err);
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
