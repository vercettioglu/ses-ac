'use client';

import { useEffect, useState } from 'react';
import { BellRing, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detectOS, getBrowserName, type OSKind } from '@/lib/client/platform';
import { showLocalNotification } from '@/lib/client/push-client';

const STEPS: Record<OSKind, (b: string) => string[]> = {
  macos: (b) => [
    'Sistem Ayarları → Bildirimler’i açın.',
    `Listeden ${b}’ı bulun.`,
    '“Bildirimlere İzin Ver”i açın (stil: Şeritler veya Uyarılar).',
    'Üst çubuktaki Odak / Rahatsız Etmeyin modu kapalı olsun.',
  ],
  windows: (b) => [
    'Ayarlar → Sistem → Bildirimler’i açın.',
    `${b} için bildirimleri açın.`,
    '“Rahatsız etmeyin” / “Odak yardımı” kapalı olsun.',
  ],
  android: (b) => [
    `Telefon Ayarları → Uygulamalar → ${b} (veya Susma).`,
    'Bildirimler’i açın.',
    'Rahatsız Etmeyin modu kapalı olsun.',
  ],
  ios: () => [
    'Ayarlar → Bildirimler → Susma’yı açın.',
    '“Bildirimlere İzin Ver”i açın (Şeritler + Sesler).',
    'Odak / Rahatsız Etmeyin modu kapalı olsun.',
  ],
  linux: (b) => [
    `İşletim sistemi bildirim ayarlarından ${b} için bildirimlere izin verin.`,
    '“Rahatsız etmeyin” modunu kapatın.',
  ],
  unknown: (b) => [
    `Cihazınızın bildirim ayarlarından ${b} için bildirimlere izin verin.`,
    '“Rahatsız etmeyin” / “Odak” modunu kapatın.',
  ],
};

export function NotificationHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [os, setOs] = useState<OSKind>('unknown');
  const [browser, setBrowser] = useState('tarayıcınız');
  const [open, setOpen] = useState(defaultOpen);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setOs(detectOS());
    setBrowser(getBrowserName());
  }, []);

  async function test() {
    setMsg(null);
    const ok = await showLocalNotification(
      'Susma test bildirimi ✅',
      'Bu bildirimi gördüyseniz her şey yolunda.',
    );
    if (ok) {
      setMsg('Test gönderildi — bildirim çubuğunuza/merkezinize bakın. Görmediyseniz aşağıdaki adımları izleyin.');
    } else {
      setMsg('Bildirim gösterilemedi. Aşağıdaki adımları izleyin.');
      setOpen(true);
    }
  }

  const steps = (STEPS[os] ?? STEPS.unknown)(browser);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HelpCircle className="h-4 w-4 text-primary" /> Bildirim gelmiyor mu?
        </div>
        <Button size="sm" variant="outline" onClick={test}>
          <BellRing className="h-4 w-4" /> Test gönder
        </Button>
      </div>

      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 flex items-center gap-1 text-sm font-medium text-primary"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Cihaz bildirim ayarları nasıl açılır?
      </button>

      {open && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
