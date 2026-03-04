import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/projects/[id]/comments/[commentId] — resolve/unresolve or update
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { isResolved, content } = body;

  const comment = await prisma.blockComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (isResolved !== undefined) {
    data.isResolved = isResolved;
    if (isResolved) {
      data.resolvedBy = session.user.name || session.user.id;
      data.resolvedAt = new Date();
    } else {
      data.resolvedBy = null;
      data.resolvedAt = null;
    }
  }

  if (content !== undefined) {
    data.content = content.trim();
  }

  const updated = await prisma.blockComment.update({
    where: { id: commentId },
    data,
  });

  return NextResponse.json(updated);
}
