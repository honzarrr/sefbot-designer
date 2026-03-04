import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id] — get project with full data
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      lock: {
        select: {
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const data = JSON.parse(project.data);

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status.toLowerCase(),
    ...data,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    lockedBy: project.lock
      ? {
          userId: project.lock.userId,
          name: `${project.lock.user.firstName} ${project.lock.user.lastName}`,
        }
      : null,
  });
}

// PUT /api/projects/[id] — save project data (auto-save target)
export async function PUT(
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

  // Extract the project metadata vs the canvas data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, status, id: _bodyId, createdAt: _ca, updatedAt: _ua, lockedBy: _lb, ...canvasData } = body;

  const updateData: Record<string, unknown> = {};
  // Only update canvas data if there's actual content (avoid wiping on metadata-only updates)
  if (Object.keys(canvasData).length > 0) {
    updateData.data = JSON.stringify(canvasData);
  }
  if (name) updateData.name = name;
  if (status) updateData.status = status.toUpperCase();

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status.toLowerCase(),
    updatedAt: project.updatedAt.toISOString(),
  });
}

// DELETE /api/projects/[id] — delete project (admin only)
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

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
