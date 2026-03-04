import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export const { GET } = handlers;

// Wrap POST with rate limiting for login attempts (10 attempts / 15 min per IP)
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const check = rateLimit(`auth:${ip}`, 10, 15 * 60 * 1000);
  if (!check.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(check.retryAfterSeconds) } }
    );
  }

  return handlers.POST(req);
}
