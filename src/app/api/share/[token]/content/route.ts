import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyShareJWT } from '@/lib/share-jwt';

function getShareJWT(req: NextRequest): string | null {
  // Check cookie first
  const cookie = req.cookies.get('share-session')?.value;
  if (cookie) return cookie;

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

// GET /api/share/[token]/content — get project content for shared view
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
    include: {
      project: { select: { id: true, name: true, data: true, status: true } },
    },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
  }

  // Parse project data and strip connections/conditions/anchors
  let projectData;
  try {
    projectData = JSON.parse(share.project.data);
  } catch {
    return NextResponse.json({ error: 'Invalid project data' }, { status: 500 });
  }

  // Return blocks and positions only — NO connections, conditions, anchors
  return NextResponse.json({
    id: share.project.id,
    name: share.project.name,
    status: share.project.status,
    steps: projectData.steps || [],
    softStarts: projectData.softStarts || [],
    notes: projectData.notes || [],
    nodePositions: projectData.nodePositions || {},
    // Explicitly exclude: connections, conditions, anchors
  });
}
