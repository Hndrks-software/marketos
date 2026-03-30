/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per IP within a sliding window.
 *
 * Note: This resets on server restart and is per-instance only.
 * For production at scale, consider Redis-based rate limiting.
 */

const store = new Map<string, { count: number; resetAt: number }>()

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of store) {
      if (now > val.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given identifier (usually IP + route).
 * @param identifier Unique key (e.g. "192.168.1.1:/api/chat")
 * @param maxRequests Maximum requests allowed in the window
 * @param windowMs Time window in milliseconds (default: 60000 = 1 min)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++
  store.set(identifier, entry)

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Get client IP from request headers.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Rate limit response helper.
 */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'Te veel verzoeken. Probeer het later opnieuw.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
}
