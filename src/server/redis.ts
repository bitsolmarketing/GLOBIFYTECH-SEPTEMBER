import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

/** Returns a shared Redis client, or null when REDIS_URL is not configured. */
export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.redis = null;
    return null;
  }
  const client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true, enableOfflineQueue: false });
  client.on("error", (err) => console.error(JSON.stringify({ level: "error", msg: "redis error", err: err.message })));
  client.connect().catch(() => {
    /* handled by error listener */
  });
  globalForRedis.redis = client;
  return client;
}
