import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/projects/[id]/steps/[stepId] — update step output/input/jump/settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stepId } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, type, color, output, input, jump, settings: stepSettings, sortOrder } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (color !== undefined) data.color = color;
  if (output !== undefined) data.output = JSON.stringify(output);
  if (input !== undefined) data.input = JSON.stringify(input);
  if (jump !== undefined) data.jump = JSON.stringify(jump);
  if (stepSettings !== undefined) data.settings = JSON.stringify(stepSettings);
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const step = await prisma.chatbotStep.update({
    where: { id: stepId },
    data,
  });

  return NextResponse.json({
    id: step.id,
    projectId: step.projectId,
    sourceBlockId: step.sourceBlockId,
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
  });
}
