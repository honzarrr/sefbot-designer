import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/trash — list soft-deleted chatbots for an org
// Note: [id] here is the organization ID
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const chatbots = await prisma.chatbot.findMany({
    where: {
      organizationId: id,
      deletedAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { deletedAt: 'desc' },
  });

  return NextResponse.json(chatbots.map((c) => ({
    id: c.id,
    name: c.name,
    organizationId: c.organizationId,
    deletedAt: c.deletedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
}
