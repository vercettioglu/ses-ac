// Basit, bellek-içi kayan pencere rate limiter.
// NOT (TODO): Çok örnekli (multi-instance) üretim ortamı için Redis tabanlı
// bir limiter'a geçilmelidir. Tek örnekli MVP için bu yeterlidir.

const buckets = new Map<string, number[]>();

export type RateResult = { allowed: boolean; retryAfterSec: number; remaining: number };

export function checkRateLimit(key: string, limit: number, windowMs = 60_000): RateResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, hits);
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, retryAfterSec: 0, remaining: Math.max(0, limit - hits.length) };
}

// Test/temizlik için.
export function resetRateLimit(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}
