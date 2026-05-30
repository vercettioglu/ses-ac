import Link from 'next/link';
import { Megaphone, Settings } from 'lucide-react';

// Public sayfalar için sade üst başlık.
export function AppHeader({ showSettings = true }: { showSettings?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="container flex h-14 max-w-md items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Megaphone className="h-5 w-5" />
          </span>
          <span className="text-lg">Susma</span>
        </Link>
        {showSettings && (
          <Link
            href="/settings"
            aria-label="Ayarlar"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}
