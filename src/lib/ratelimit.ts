/**
 * Простой sliding-window лимитер в памяти инстанса.
 * На Vercel каждый инстанс считает отдельно, поэтому это «мягкая» защита от всплесков;
 * жёсткую защиту от двойных операций обеспечивают блокировки и idempotency-ключи в PostgreSQL.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowSec: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs * 2) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}
