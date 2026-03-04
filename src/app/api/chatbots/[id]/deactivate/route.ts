import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/deactivate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const chatbot = await prisma.chatbot.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({
    id: chatbot.id,
    active: chatbot.active,
    updatedAt: chatbot.updatedAt.toISOString(),
  });
}
