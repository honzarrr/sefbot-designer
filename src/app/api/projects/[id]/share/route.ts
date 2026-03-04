import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

function generateCuid(): string {
  // Use crypto for a URL-safe token
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// POST /api/projects/[id]/share — generate share link
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { password, expiresAt } = body;

  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password is required and must be at least 6 characters' },
      { status: 400 }
    );
  }

  if (expiresAt) {
    const expireDate = new Date(expiresAt);
    if (isNaN(expireDate.getTime())) {
      return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 });
    }
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const shareToken = generateCuid();
  const passwordHash = await hash(password, 12);

  const share = await prisma.projectShare.create({
    data: {
      projectId: id,
      shareToken,
      password: passwordHash,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id!,
    },
  });

  const baseUrl = req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin;

  return NextResponse.json({
    id: share.id,
    shareUrl: `${baseUrl}/share/${shareToken}`,
    token: shareToken,
    password, // Return plaintext for copying
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
  }, { status: 201 });
}

// GET /api/projects/[id]/share — list active shares
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const shares = await prisma.projectShare.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shares.map((s) => ({
    id: s.id,
    token: s.shareToken,
    isActive: s.isActive,
    expiresAt: s.expiresAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  })));
}
