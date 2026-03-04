import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/cleanup-trash — permanently delete chatbots trashed > 30 days ago
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete related records first, then the chatbots
  const expiredChatbots = await prisma.chatbot.findMany({
    where: {
      deletedAt: { not: null, lt: thirtyDaysAgo },
    },
    select: { id: true },
  });

  const ids = expiredChatbots.map((c) => c.id);

  if (ids.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete in order to respect foreign key constraints
  await prisma.conversationInteraction.deleteMany({
    where: { conversation: { chatbotId: { in: ids } } },
  });
  await prisma.conversation.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.conversionEvent.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.notification.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.chatbotStep.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.chatbotVersion.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.analyticsReport.deleteMany({
    where: { chatbotId: { in: ids } },
  });
  await prisma.chatbot.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ deleted: ids.length });
}
