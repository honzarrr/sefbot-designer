import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots — list chatbots (supports ?organizationId= filter)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');

  const where: Record<string, unknown> = { deletedAt: null };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const chatbots = await prisma.chatbot.findMany({
    where,
    select: {
      id: true,
      name: true,
      organizationId: true,
      active: true,
      deletedAt: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(chatbots.map((c) => ({
    id: c.id,
    name: c.name,
    organizationId: c.organizationId,
    active: c.active,
    deletedAt: c.deletedAt?.toISOString() ?? null,
    projectId: c.projectId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
}

// POST /api/chatbots — create chatbot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, organizationId } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Chatbot name is required' }, { status: 400 });
  }
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const chatbot = await prisma.chatbot.create({
    data: {
      name: name.trim(),
      organizationId,
      settings: JSON.stringify({}),
    },
  });

  return NextResponse.json({
    id: chatbot.id,
    name: chatbot.name,
    organizationId: chatbot.organizationId,
    active: chatbot.active,
    deletedAt: null,
    projectId: null,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
  }, { status: 201 });
}
