'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Türkçe duyarlı normalize: küçük harf + aksan/diakritik sadeleştirme.
const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');
function norm(s: string): string {
  return s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(COMBINING, '');
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Seçin',
  emptyText = 'Sonuç bulunamadı',
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Dışarıdan gelen değer değişince input metnini eşitle (ör. il değişince ilçe sıfırlanır).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Dışarı tıklayınca kapat ve metni seçili değere geri al.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [value]);

  const filtered = useMemo(() => {
    // Açıkken ve kullanıcı yeni bir şey yazdıysa filtrele; aksi halde tümünü göster.
    if (open && query && query !== value) {
      const nq = norm(query);
      return options.filter((o) => norm(o).includes(nq));
    }
    return options;
  }, [open, query, value, options]);

  return (
    <div className="relative" ref={ref}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          'flex h-12 w-full rounded-lg border border-input bg-background px-4 pr-10 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      {value && !disabled ? (
        <button
          type="button"
          aria-label="Temizle"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange('');
            setQuery('');
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      )}

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-muted-foreground">{emptyText}</li>
          ) : (
            filtered.map((o) => (
              <li key={o} role="option" aria-selected={o === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o);
                    setQuery(o);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-left text-base hover:bg-muted',
                    o === value && 'font-semibold text-primary',
                  )}
                >
                  {o}
                  {o === value && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
