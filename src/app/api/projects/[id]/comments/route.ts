import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]/comments — all comments with replies
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const comments = await prisma.blockComment.findMany({
    where: { projectId: id, parentId: null },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
      todo: {
        select: { id: true, status: true, priority: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(comments);
}

// POST /api/projects/[id]/comments — add internal comment
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
  const { blockId, content, parentId } = body;

  if (!blockId || !content?.trim()) {
    return NextResponse.json(
      { error: 'blockId and content are required' },
      { status: 400 }
    );
  }

  // Sanitize content: strip HTML tags to prevent stored XSS
  const sanitizedContent = content.trim().replace(/<[^>]*>/g, '');

  const comment = await prisma.blockComment.create({
    data: {
      projectId: id,
      blockId,
      parentId: parentId || null,
      authorName: session.user.name || 'Unknown',
      authorType: 'internal',
      content: sanitizedContent,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
