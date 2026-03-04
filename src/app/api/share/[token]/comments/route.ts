import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyShareJWT } from '@/lib/share-jwt';

function getShareJWT(req: NextRequest): string | null {
  const cookie = req.cookies.get('share-session')?.value;
  if (cookie) return cookie;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

// GET /api/share/[token]/comments — get comments for shared project
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const jwt = getShareJWT(req);
  if (!jwt) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = await verifyShareJWT(jwt);
  if (!payload || payload.shareToken !== token) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  const comments = await prisma.blockComment.findMany({
    where: { projectId: share.projectId, parentId: null },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by blockId
  const grouped: Record<string, typeof comments> = {};
  for (const comment of comments) {
    if (!grouped[comment.blockId]) {
      grouped[comment.blockId] = [];
    }
    grouped[comment.blockId].push(comment);
  }

  return NextResponse.json(grouped);
}

// POST /api/share/[token]/comments — add comment from client
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const jwt = getShareJWT(req);
  if (!jwt) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = await verifyShareJWT(jwt);
  if (!payload || payload.shareToken !== token) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { blockId, authorName, authorEmail, content, parentId } = body;

  if (!blockId || !authorName?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: 'blockId, authorName, and content are required' },
      { status: 400 }
    );
  }

  // If it's a reply, verify parent exists
  if (parentId) {
    const parent = await prisma.blockComment.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.projectId !== share.projectId) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
  }

  // Sanitize content: strip HTML tags to prevent stored XSS
  const sanitizedContent = content.trim().replace(/<[^>]*>/g, '');
  const sanitizedAuthorName = authorName.trim().replace(/<[^>]*>/g, '');

  const comment = await prisma.blockComment.create({
    data: {
      projectId: share.projectId,
      blockId,
      parentId: parentId || null,
      authorName: sanitizedAuthorName,
      authorEmail: authorEmail?.trim() || null,
      authorType: 'client',
      content: sanitizedContent,
    },
  });

  // Auto-create todo for top-level comments
  if (!parentId) {
    await prisma.projectTodo.create({
      data: {
        projectId: share.projectId,
        commentId: comment.id,
        blockId,
        title: sanitizedContent.slice(0, 100),
        status: 'open',
      },
    });
  }

  return NextResponse.json(comment, { status: 201 });
}
