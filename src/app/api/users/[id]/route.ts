import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/users/[id] — delete user (admin only, cannot delete last admin)
export async function DELETE(
  _req: NextRequest,
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

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Cannot delete last admin
  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
    }
  }

  // Release any project locks held by this user
  await prisma.projectLock.deleteMany({ where: { userId: id } });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
