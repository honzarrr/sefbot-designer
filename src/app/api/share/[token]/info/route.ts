import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/share/[token]/info — public info about share (no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const share = await prisma.projectShare.findUnique({
    where: { shareToken: token },
    include: { project: { select: { name: true } } },
  });

  if (!share || !share.isActive) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
  }

  return NextResponse.json({
    projectName: share.project.name,
    requiresPassword: true,
  });
}
