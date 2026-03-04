import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/notifications/[notifId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notifId } = params;

  const notification = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

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
  });
}

// PUT /api/chatbots/[id]/notifications/[notifId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notifId } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, type, active, config, conditions } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (active !== undefined) data.active = active;
  if (config !== undefined) data.config = JSON.stringify(config);
  if (conditions !== undefined) data.conditions = conditions ? JSON.stringify(conditions) : null;

  const notification = await prisma.notification.update({
    where: { id: notifId },
    data,
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
  });
}

// DELETE /api/chatbots/[id]/notifications/[notifId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notifId } = params;

  await prisma.notification.delete({ where: { id: notifId } });

  return NextResponse.json({ success: true });
}
