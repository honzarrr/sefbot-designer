import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/notifications
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const notifications = await prisma.notification.findMany({
    where: { chatbotId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notifications.map((n) => ({
    id: n.id,
    chatbotId: n.chatbotId,
    name: n.name,
    type: n.type,
    active: n.active,
    config: JSON.parse(n.config),
    conditions: n.conditions ? JSON.parse(n.conditions) : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  })));
}

// POST /api/chatbots/[id]/notifications
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
  const { name, type, config, conditions } = body;

  if (!name?.trim() || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      chatbotId: id,
      name: name.trim(),
      type,
      config: JSON.stringify(config || {}),
      conditions: conditions ? JSON.stringify(conditions) : null,
    },
  });

  return NextResponse.json({
    id: notification.id,
    chatbotId: notification.chatbotId,
    name: notification.name,
    type: notification.type,
    active: notification.active,
    config: JSON.parse(notification.config),
    conditions: notification.conditions ? JSON.parse(notification.conditions) : null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }, { status: 201 });
}
