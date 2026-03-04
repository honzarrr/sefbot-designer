import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { signShareJWT } from '@/lib/share-jwt';
import { rateLimit, rateLimitReset } from '@/lib/rate-limit';

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

// POST /api/share/[token]/verify — verify password
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  const ip = getClientIP(req);

  const rateCheck = rateLimit(`share-verify:${ip}`, 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.', retryAfter: rateCheck.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
  }

  const isValid = await compare(password, share.password);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid password', attemptsRemaining: rateCheck.remaining },
      { status: 401 }
    );
  }

  // Reset rate limit on success
  rateLimitReset(`share-verify:${ip}`);

  const jwt = await signShareJWT({
    shareToken: token,
    projectId: share.projectId,
  });

  const response = NextResponse.json({ token: jwt, projectId: share.projectId });

  response.cookies.set('share-session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return response;
}
