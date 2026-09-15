import "server-only";
import { getRedis } from "./redis";

interface Bucket {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Bucket>();

function sweep(now: number) {
  if (memory.size < 5000) return;
  for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Fixed-window rate limiter. Uses Redis when available, otherwise an in-memory
 * map (adequate for a single instance in development).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  if (redis && redis.status === "ready") {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSeconds);
    const ttl = await redis.ttl(redisKey);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetInSeconds: Math.max(ttl, 0) };
  }
  sweep(now);
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Convenience wrapper that throws a rate-limit error for server actions. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    const { AppError } = await import("./errors");
    throw AppError.rateLimited(`Too many attempts. Try again in ${result.resetInSeconds}s.`);
  }
  return result;
}
