import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/users — list all users
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      passwordHash: false,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

// POST /api/users — invite new user (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { firstName, lastName, email, role } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check max 30 users
  const count = await prisma.user.count();
  if (count >= 30) {
    return NextResponse.json({ error: 'Maximum of 30 users reached' }, { status: 400 });
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      role: role === 'ADMIN' ? 'ADMIN' : 'EDITOR',
      inviteToken,
      inviteExpires,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  const inviteLink = `/register?token=${inviteToken}`;

  return NextResponse.json({ user, inviteToken, inviteLink }, { status: 201 });
}
