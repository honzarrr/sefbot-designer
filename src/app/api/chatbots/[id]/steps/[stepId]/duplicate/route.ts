import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/steps/[stepId]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, stepId } = params;

  const original = await prisma.chatbotStep.findUnique({ where: { id: stepId } });
  if (!original) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Get next number and sortOrder
  const lastStep = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { number: 'desc' },
  });
  const lastSort = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { sortOrder: 'desc' },
  });

  const step = await prisma.chatbotStep.create({
    data: {
      chatbotId: id,
      number: (lastStep?.number ?? 0) + 1,
      name: `${original.name} (copy)`,
      type: original.type,
      color: original.color,
      output: original.output,
      input: original.input,
      jump: original.jump,
      settings: original.settings,
      sortOrder: (lastSort?.sortOrder ?? 0) + 1,
      projectId: original.projectId,
      sourceBlockId: original.sourceBlockId,
    },
  });

  return NextResponse.json({
    id: step.id,
    chatbotId: step.chatbotId,
    number: step.number,
    name: step.name,
    type: step.type,
    color: step.color,
    output: JSON.parse(step.output),
    input: JSON.parse(step.input),
    jump: JSON.parse(step.jump),
    settings: JSON.parse(step.settings),
    sortOrder: step.sortOrder,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  }, { status: 201 });
}
