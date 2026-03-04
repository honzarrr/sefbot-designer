import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/notifications/[notifId]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, notifId } = params;

  const original = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!original) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  const notification = await prisma.notification.create({
    data: {
      chatbotId: id,
      name: `${original.name} (copy)`,
      type: original.type,
      active: false,
      config: original.config,
      conditions: original.conditions,
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
