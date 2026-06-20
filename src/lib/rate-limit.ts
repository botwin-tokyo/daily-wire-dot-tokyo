/**
 * Simple KV-backed rate limiter for server routes.
 *
 * Uses a sliding window based on a TTL. Not perfectly distributed, but good
 * enough for protecting admin endpoints on Cloudflare Pages.
 */

const WINDOW_SECONDS = 60 * 60; // 1 hour

export interface RateLimiter {
  allow(key: string, limit: number): Promise<boolean>;
}

export function createRateLimiter(getKv: () => KVNamespace | undefined): RateLimiter {
  return {
    async allow(key: string, limit: number): Promise<boolean> {
      const kv = getKv();
      if (!kv) {
        // If KV is not bound, allow the request but warn.
        console.warn(`Rate limiter skipped: KV not bound (key=${key})`);
        return true;
      }
      const countKey = `rate:${key}`;
      const current = await kv.get(countKey);
      const count = current ? parseInt(current, 10) : 0;
      if (count >= limit) {
        return false;
      }
      await kv.put(countKey, String(count + 1), { expirationTtl: WINDOW_SECONDS });
      return true;
    },
  };
}
