import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const original = await prisma.chatbot.findUnique({
    where: { id },
    include: { steps: true },
  });

  if (!original) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  const chatbot = await prisma.chatbot.create({
    data: {
      name: `${original.name} (copy)`,
      organizationId: original.organizationId,
      active: false,
      settings: original.settings,
      projectId: original.projectId,
      steps: {
        create: original.steps.map((s) => ({
          number: s.number,
          name: s.name,
          type: s.type,
          color: s.color,
          output: s.output,
          input: s.input,
          jump: s.jump,
          settings: s.settings,
          sortOrder: s.sortOrder,
          projectId: s.projectId,
          sourceBlockId: s.sourceBlockId,
        })),
      },
    },
  });

  return NextResponse.json({
    id: chatbot.id,
    name: chatbot.name,
    organizationId: chatbot.organizationId,
    active: chatbot.active,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
  }, { status: 201 });
}
