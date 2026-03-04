import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/urls
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

    const conversations = await prisma.conversation.findMany({
      where: { chatbotId: id, isPreview: false, pageUrl: { not: null }, ...dateFilter },
      select: { pageUrl: true },
    });

    const counts: Record<string, number> = {};
    for (const c of conversations) {
      if (c.pageUrl) {
        counts[c.pageUrl] = (counts[c.pageUrl] || 0) + 1;
      }
    }

    const data = Object.entries(counts)
      .map(([pageUrl, count]) => ({ pageUrl, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching URL analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
