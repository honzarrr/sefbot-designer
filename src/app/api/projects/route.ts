import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects — list all projects with lock status
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lock: {
        select: {
          userId: true,
          lockedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status.toLowerCase(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lockedBy: p.lock
      ? {
          userId: p.lock.userId,
          name: `${p.lock.user.firstName} ${p.lock.user.lastName}`,
          lockedAt: p.lock.lockedAt.toISOString(),
        }
      : null,
  }));

  return NextResponse.json(result);
}

// POST /api/projects — create new project
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const projectData = {
    steps: [],
    conditions: [],
    softStarts: [],
    notes: [],
    connections: [],
    anchors: [],
    versions: [],
    nodePositions: {},
  };

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      status: 'DRAFT',
      data: JSON.stringify(projectData),
    },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: 'draft',
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }, { status: 201 });
}
