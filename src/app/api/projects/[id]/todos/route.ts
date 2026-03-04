import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]/todos — list todos
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { projectId: id };
  if (status) {
    where.status = status;
  }

  const todos = await prisma.projectTodo.findMany({
    where,
    include: {
      comment: {
        select: {
          id: true,
          content: true,
          authorName: true,
          authorType: true,
          blockId: true,
          isResolved: true,
        },
      },
      assignee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(todos);
}

// POST /api/projects/[id]/todos — create manual todo
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
  const { title, description, blockId, priority, assigneeId } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const todo = await prisma.projectTodo.create({
    data: {
      projectId: id,
      title: title.trim(),
      description: description?.trim() || null,
      blockId: blockId || null,
      priority: priority || 'normal',
      assigneeId: assigneeId || null,
      status: 'open',
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
