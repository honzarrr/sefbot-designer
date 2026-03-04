// In-memory rate limiter for API routes
// In production, replace with Redis-backed solution for multi-instance deployments

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Check and increment rate limit for a given key.
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param max - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  // Within window — check limit
  if (entry.count >= max) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  // Increment
  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

/**
 * Reset rate limit for a given key (e.g., on successful auth).
 */
export function rateLimitReset(key: string): void {
  store.delete(key);
}
