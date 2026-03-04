import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/projects/[id]/share/[token] — revoke share
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; token: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, token } = params;

  const share = await prisma.projectShare.findFirst({
    where: { projectId: id, shareToken: token },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  await prisma.projectShare.update({
    where: { id: share.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
