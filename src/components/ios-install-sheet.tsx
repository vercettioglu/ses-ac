'use client';

import { useEffect } from 'react';
import { Share, Plus, Smartphone, Bell, X } from 'lucide-react';

const STEPS = [
  {
    icon: Share,
    title: 'Paylaş butonuna dokunun',
    desc: 'Safari’nin alt çubuğundaki paylaşma simgesine dokunun.',
  },
  {
    icon: Plus,
    title: '“Ana Ekrana Ekle” seçin',
    desc: 'Açılan menüde “Ana Ekrana Ekle” seçeneğine dokunun.',
  },
  {
    icon: Smartphone,
    title: 'Ana ekrandan açın',
    desc: 'Ana ekranınızdaki Susma simgesine dokunarak uygulamayı açın.',
  },
  {
    icon: Bell,
    title: 'Bildirimleri açın',
    desc: 'Uygulama açılınca “Bildirimleri Aç” butonuna dokunmanız yeterli.',
  },
];

// iPhone/iPad'de PWA olarak açılmamışsa gösterilen alttan açılır yönlendirme.
export function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Kapat"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="safe-bottom relative w-full max-w-md rounded-t-2xl border-t border-border bg-card p-5 shadow-xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/25" />
        <button
          aria-label="Kapat"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-lg font-bold">Bildirimleri açmak için</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          iPhone ve iPad’de bildirim alabilmek için Susma’yı önce ana ekranınıza eklemeniz gerekir.
          Aşağıdaki adımları izleyin:
        </p>

        <ol className="space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                      {i + 1}
                    </span>
                    <span className="font-semibold">{step.title}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
