import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/time-series?range=7d|30d|90d|custom&start=&end=
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
    const range = url.searchParams.get('range') || '7d';

    let startDate: Date;
    const endDate = new Date();

    if (range === 'custom') {
      const startParam = url.searchParams.get('start');
      const endParam = url.searchParams.get('end');
      startDate = startParam ? new Date(startParam) : new Date(Date.now() - 7 * 86400000);
      if (endParam) endDate.setTime(new Date(endParam).getTime());
    } else {
      const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
      startDate = new Date(Date.now() - days * 86400000);
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        chatbotId: id,
        isPreview: false,
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<string, number>();

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= endDate) {
      dailyMap.set(current.toISOString().split('T')[0], 0);
      current.setDate(current.getDate() + 1);
    }

    for (const conv of conversations) {
      const dateKey = conv.startedAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    }

    const data = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      conversations: count,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching time series:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
