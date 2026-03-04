import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/projects/[id]/todos/[todoId] — update todo
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; todoId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { todoId } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { status, assigneeId, priority, title, description } = body;

  const todo = await prisma.projectTodo.findUnique({
    where: { id: todoId },
  });

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (status !== undefined) data.status = status;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (priority !== undefined) data.priority = priority;
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;

  const updated = await prisma.projectTodo.update({
    where: { id: todoId },
    data,
  });

  // If marking done and has linked comment, resolve the comment too
  if (status === 'done' && todo.commentId) {
    await prisma.blockComment.update({
      where: { id: todo.commentId },
      data: {
        isResolved: true,
        resolvedBy: session.user.name || session.user.id,
        resolvedAt: new Date(),
      },
    });
  }

  return NextResponse.json(updated);
}
