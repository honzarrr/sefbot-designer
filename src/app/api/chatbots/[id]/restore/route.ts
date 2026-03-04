import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/restore — restore soft-deleted chatbot
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const chatbot = await prisma.chatbot.findUnique({ where: { id } });
  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }
  if (!chatbot.deletedAt) {
    return NextResponse.json({ error: 'Chatbot is not deleted' }, { status: 400 });
  }

  const restored = await prisma.chatbot.update({
    where: { id },
    data: { deletedAt: null, active: true },
  });

  return NextResponse.json({
    id: restored.id,
    name: restored.name,
    active: restored.active,
    deletedAt: null,
    updatedAt: restored.updatedAt.toISOString(),
  });
}
