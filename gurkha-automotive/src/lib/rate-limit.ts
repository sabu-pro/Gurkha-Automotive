import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

/**
 * IP rate limiting for the public POST routes, backed by Upstash Redis.
 *
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured the
 * limiter fails OPEN — every request is allowed — so local development and any
 * deployment without Upstash keeps working exactly as before. It also fails
 * open if Redis is unreachable: a limiter outage must never block bookings.
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Limiters are cached per configuration so the sliding-window state is shared
// across requests instead of being rebuilt on every call.
const limiters = new Map<string, Ratelimit>();

function getLimiter(key: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;

  const cacheKey = `${key}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${key}`,
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/** Client IP from the proxy header, or null when it can't be determined. */
function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  const ip = forwardedFor.split(",")[0]?.trim();
  return ip || null;
}

/**
 * Check whether this client may make another request against `key`.
 * Never throws — on any misconfiguration or backend failure it allows through.
 */
export async function checkRateLimit(
  request: NextRequest,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const limiter = getLimiter(key, limit, windowSeconds);
  if (!limiter) return { allowed: true };

  const ip = getClientIp(request);
  if (!ip) return { allowed: true };

  try {
    const { success } = await limiter.limit(ip);
    return { allowed: success };
  } catch (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return { allowed: true };
  }
}
