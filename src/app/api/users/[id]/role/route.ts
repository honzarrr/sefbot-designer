import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/users/[id]/role — toggle admin/editor (admin only, protect last admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { role } = body;

  if (role !== 'ADMIN' && role !== 'EDITOR') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // If demoting from admin, check last admin protection
  if (targetUser.role === 'ADMIN' && role === 'EDITOR') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
