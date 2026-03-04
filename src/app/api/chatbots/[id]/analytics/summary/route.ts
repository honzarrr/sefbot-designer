import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/summary
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    const dateFilter: { startedAt?: { gte?: Date; lte?: Date } } = {};
    if (start || end) {
      dateFilter.startedAt = {};
      if (start) dateFilter.startedAt.gte = new Date(start);
      if (end) dateFilter.startedAt.lte = new Date(end);
    }

    const where = { chatbotId: id, isPreview: false, ...dateFilter };

    const [totalConversations, conversations, emailInteractions, phoneInteractions, faqInteractions] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        select: { startedAt: true, endedAt: true },
      }),
      prisma.conversationInteraction.count({
        where: {
          conversation: { chatbotId: id, isPreview: false, ...dateFilter },
          type: 'email_collected',
        },
      }),
      prisma.conversationInteraction.count({
        where: {
          conversation: { chatbotId: id, isPreview: false, ...dateFilter },
          type: 'phone_collected',
        },
      }),
      prisma.conversationInteraction.count({
        where: {
          conversation: { chatbotId: id, isPreview: false, ...dateFilter },
          type: 'faq_view',
        },
      }),
    ]);

    // Calculate average duration (only for completed conversations)
    const completedConversations = conversations.filter((c) => c.endedAt);
    const avgDurationMs = completedConversations.length > 0
      ? completedConversations.reduce((sum, c) => {
          return sum + (c.endedAt!.getTime() - c.startedAt.getTime());
        }, 0) / completedConversations.length
      : 0;

    // Unique sessions = total conversations (each has unique sessionId)
    return NextResponse.json({
      opens: totalConversations,
      uniqueSessions: totalConversations,
      emailsCollected: emailInteractions,
      phonesCollected: phoneInteractions,
      faqViews: faqInteractions,
      avgDurationSeconds: Math.round(avgDurationMs / 1000),
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
