import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/organizations/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { _count: { select: { chatbots: true } } },
  });

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  if (org._count.chatbots > 0) {
    return NextResponse.json(
      { error: 'Cannot delete organization with chatbots. Remove all chatbots first.' },
      { status: 400 }
    );
  }

  await prisma.organization.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
