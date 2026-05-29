import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

export const metadata: Metadata = {
  title: {
    default: 'Ses Aç — Bölgenizdeki duyuruları anında alın',
    template: '%s · Ses Aç',
  },
  description: 'Bölgenizdeki önemli duyuruları anında alın. Sade, hızlı, izinli bildirimler.',
  applicationName: 'Ses Aç',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ses Aç',
  },
  other: {
    // Modern muadili (apple-mobile-web-app-capable deprecation uyarısını giderir)
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#d8392b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
