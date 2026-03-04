import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/projects/[id]/lock — acquire lock on project open
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  // Check if project exists
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check if already locked
  const existingLock = await prisma.projectLock.findUnique({
    where: { projectId: id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  if (existingLock) {
    if (existingLock.userId === session.user.id) {
      // Already locked by this user, refresh lock
      return NextResponse.json({ locked: true, by: 'self' });
    }
    return NextResponse.json({
      error: 'Project is locked',
      lockedBy: {
        userId: existingLock.userId,
        name: `${existingLock.user.firstName} ${existingLock.user.lastName}`,
        lockedAt: existingLock.lockedAt.toISOString(),
      },
    }, { status: 409 });
  }

  // Release any existing lock this user has on another project
  await prisma.projectLock.deleteMany({ where: { userId: session.user.id } });

  // Acquire lock
  await prisma.projectLock.create({
    data: {
      projectId: id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ locked: true, by: 'self' });
}

// DELETE /api/projects/[id]/lock — release lock on close (or admin force-release)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const existingLock = await prisma.projectLock.findUnique({
    where: { projectId: id },
  });

  if (!existingLock) {
    return NextResponse.json({ success: true });
  }

  // Only the lock owner or an admin can release
  if (existingLock.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.projectLock.delete({ where: { projectId: id } });

  return NextResponse.json({ success: true });
}

// GET /api/projects/[id]/lock — check lock status
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const lock = await prisma.projectLock.findUnique({
    where: { projectId: id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  if (!lock) {
    return NextResponse.json({ locked: false });
  }

  return NextResponse.json({
    locked: true,
    lockedBy: {
      userId: lock.userId,
      name: `${lock.user.firstName} ${lock.user.lastName}`,
      lockedAt: lock.lockedAt.toISOString(),
      isSelf: lock.userId === session.user.id,
    },
  });
}
