import NodeCache from 'node-cache';

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '60', 10);
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 30 });

export function getDashboardCacheKey(endpoint: string, range: string): string {
  return `dashboard:${endpoint}:${range}`;
}

export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttl?: number): boolean {
  return ttl ? cache.set(key, value, ttl) : cache.set(key, value);
}

export function deleteCache(key: string): number {
  return cache.del(key);
}

export function invalidateCache(prefix: string): number {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.startsWith(prefix));
  let count = 0;
  for (const key of matchingKeys) { cache.del(key); count++; }
  return count;
}

export function clearCache(): void { cache.flushAll(); }

export function getCacheStats() {
  const stats = cache.getStats();
  return { keys: cache.keys().length, hits: stats.hits, misses: stats.misses };
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<{ data: T; cached: boolean }> {
  const cached = getCache<T>(key);
  if (cached !== undefined) {
    return { data: cached, cached: true };
  }
  const data = await fn();
  setCache(key, data, ttl);
  return { data, cached: false };
}

export default cache;
