import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/chatbots/[id]/notifications/[notifId]/toggle
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { notifId } = params;

  const current = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!current) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  const notification = await prisma.notification.update({
    where: { id: notifId },
    data: { active: !current.active },
  });

  return NextResponse.json({
    id: notification.id,
    active: notification.active,
    updatedAt: notification.updatedAt.toISOString(),
  });
}
