import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/steps — list steps for a chatbot
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const steps = await prisma.chatbotStep.findMany({
    where: { chatbotId: id },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(steps.map((s) => ({
    id: s.id,
    chatbotId: s.chatbotId,
    projectId: s.projectId,
    sourceBlockId: s.sourceBlockId,
    number: s.number,
    name: s.name,
    type: s.type,
    color: s.color,
    output: JSON.parse(s.output),
    input: JSON.parse(s.input),
    jump: JSON.parse(s.jump),
    settings: JSON.parse(s.settings),
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
}

// POST /api/chatbots/[id]/steps — create a new step
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, type, color, output, input, jump, settings: stepSettings } = body;

  if (!name?.trim() || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
  }

  // Get next number
  const lastStep = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { number: 'desc' },
  });
  const number = (lastStep?.number ?? 0) + 1;

  // Get next sortOrder
  const lastSort = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { sortOrder: 'desc' },
  });
  const sortOrder = (lastSort?.sortOrder ?? 0) + 1;

  const step = await prisma.chatbotStep.create({
    data: {
      chatbotId: id,
      number,
      name: name.trim(),
      type,
      color: color || '#607D8B',
      output: JSON.stringify(output || []),
      input: JSON.stringify(input || {}),
      jump: JSON.stringify(jump || []),
      settings: JSON.stringify(stepSettings || {}),
      sortOrder,
    },
  });

  return NextResponse.json({
    id: step.id,
    chatbotId: step.chatbotId,
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
  }, { status: 201 });
}
