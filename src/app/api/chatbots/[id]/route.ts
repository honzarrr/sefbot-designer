import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: chatbot.id,
    name: chatbot.name,
    organizationId: chatbot.organizationId,
    active: chatbot.active,
    deletedAt: chatbot.deletedAt?.toISOString() ?? null,
    settings: chatbot.settings ? JSON.parse(chatbot.settings) : null,
    projectId: chatbot.projectId,
    steps: chatbot.steps.map((s) => ({
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
    })),
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
  });
}

// PUT /api/chatbots/[id] — update chatbot metadata
export async function PUT(
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
  const { name, active } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (active !== undefined) data.active = active;

  const chatbot = await prisma.chatbot.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: chatbot.id,
    name: chatbot.name,
    organizationId: chatbot.organizationId,
    active: chatbot.active,
    deletedAt: chatbot.deletedAt?.toISOString() ?? null,
    projectId: chatbot.projectId,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
  });
}

// DELETE /api/chatbots/[id] — soft delete
export async function DELETE(
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
    data: { deletedAt: new Date(), active: false },
  });

  return NextResponse.json({
    id: chatbot.id,
    deletedAt: chatbot.deletedAt?.toISOString(),
  });
}
