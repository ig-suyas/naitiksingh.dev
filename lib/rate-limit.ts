/**
 * Small sliding-window rate limiter. It lives in memory, so on serverless
 * hosts each warm instance keeps its own window. That's enough to stop casual
 * form spam; swap in Upstash/Redis if the site ever needs a hard global limit.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfter = Math.ceil((windowMs - (now - recent[0]!)) / 1000);
    return { ok: false as const, retryAfter };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true as const, retryAfter: 0 };
}
