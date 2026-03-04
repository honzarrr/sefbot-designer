import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/weekends
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

    const [weekday, weekend] = await Promise.all([
      prisma.conversation.count({
        where: { chatbotId: id, isPreview: false, isWeekend: false, ...dateFilter },
      }),
      prisma.conversation.count({
        where: { chatbotId: id, isPreview: false, isWeekend: true, ...dateFilter },
      }),
    ]);

    return NextResponse.json({
      data: [
        { label: 'Weekday', count: weekday },
        { label: 'Weekend', count: weekend },
      ],
    });
  } catch (error) {
    console.error('Error fetching weekend analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
