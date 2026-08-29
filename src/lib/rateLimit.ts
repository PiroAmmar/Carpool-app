import { NextResponse } from 'next/server';

/**
 * Best-effort in-memory rate limiter. Per-instance only — Vercel serverless
 * functions don't share memory across invocations/regions, so this is a
 * speed bump against naive loops/scripts, not a hard guarantee. Good enough
 * at 10-15 user scale; swap for Upstash/Redis if abuse becomes real.
 */
const hits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns null if under the limit, or a 429 NextResponse if over it.
 * Call at the top of a route handler: `const limited = rateLimit(req, 'bookings-create'); if (limited) return limited;`
 */
export function rateLimit(
  req: Request,
  bucketKey: string,
  { limit = 20, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  const key = `${bucketKey}:${getClientIp(req)}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const recent = (hits.get(key) || []).filter((t) => t > windowStart);
  recent.push(now);
  hits.set(key, recent);

  if (recent.length > limit) {
    return NextResponse.json({ error: 'Too many requests, slow down' }, { status: 429 });
  }

  return null;
}
