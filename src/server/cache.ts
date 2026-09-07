import Redis from 'ioredis';
import { config } from './config';
import { RateLimited, ProviderUnavailable } from '@/providers/instagram/exceptions';
declare global {
  var rigRedis: Redis | undefined;
  var rigMemory: Map<string, { value: string; expires: number }> | undefined;
}
export function redis() {
  if (!config.REDIS_URL) return null;
  if (!globalThis.rigRedis) {
    globalThis.rigRedis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    globalThis.rigRedis.on('error', () => {});
  }
  return globalThis.rigRedis;
}
async function readyRedis() {
  const r = redis();
  if (r?.status === 'wait') await r.connect();
  if (r && r.status !== 'ready') throw new ProviderUnavailable();
  return r;
}
const memory = () => (globalThis.rigMemory ??= new Map());
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await readyRedis();
  if (r) {
    const v = await r.get(key);
    return v ? JSON.parse(v) : null;
  }
  const item = memory().get(key);
  if (!item || item.expires < Date.now()) {
    memory().delete(key);
    return null;
  }
  return JSON.parse(item.value);
}
export async function cacheSet(key: string, value: unknown, seconds: number) {
  const r = await readyRedis();
  if (r) {
    await r.set(key, JSON.stringify(value), 'EX', seconds);
    return;
  }
  if (memory().size > 10000) {
    for (const [k, v] of memory()) if (v.expires < Date.now()) memory().delete(k);
  }
  memory().set(key, { value: JSON.stringify(value), expires: Date.now() + seconds * 1000 });
}
export async function limit(key: string, max = 120, seconds = 60) {
  const r = await readyRedis();
  let count: number;
  if (r) {
    count = Number(
      await r.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        `limit:${key}`,
        seconds,
      ),
    );
  } else {
    const k = `limit:${key}`,
      old = memory().get(k);
    const item =
      old && old.expires > Date.now() ? old : { value: '0', expires: Date.now() + seconds * 1000 };
    count = Number(item.value) + 1;
    item.value = String(count);
    memory().set(k, item);
  }
  if (count > max) throw new RateLimited(seconds);
}
