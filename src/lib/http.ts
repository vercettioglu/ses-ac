import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { env } from './env';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

// Zod / genel hataları tek noktadan yanıta çevir.
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail(first?.message ?? 'Geçersiz veri', 422, {
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return fail(err.message, err.status);
  }
  console.error('[API] beklenmeyen hata:', err);
  return fail('Sunucu hatası', 500);
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Basit CSRF önlemi: state değiştiren isteklerde Origin/Referer kontrolü.
// SameSite=Lax cookie ile birlikte ek koruma sağlar.
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  // Origin yoksa (ör. bazı same-origin GET'ler) geç; sadece varsa doğrula.
  if (!origin) return;

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError('Geçersiz origin', 403);
  }

  let appHost = '';
  try {
    appHost = new URL(env.appUrl).host;
  } catch {
    /* yoksay */
  }

  // Lokal geliştirmede her localhost/127.0.0.1 portuna izin ver.
  const isLocal =
    originHost === 'localhost' ||
    originHost.startsWith('localhost:') ||
    originHost === '127.0.0.1' ||
    originHost.startsWith('127.0.0.1:');

  if (originHost === appHost || isLocal) return;

  throw new HttpError('İzin verilmeyen kaynak (CSRF)', 403);
}
