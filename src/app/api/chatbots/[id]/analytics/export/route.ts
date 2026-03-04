import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/export?format=csv|json
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
    const format = url.searchParams.get('format') || 'json';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    const dateFilter: { startedAt?: { gte?: Date; lte?: Date } } = {};
    if (start || end) {
      dateFilter.startedAt = {};
      if (start) dateFilter.startedAt.gte = new Date(start);
      if (end) dateFilter.startedAt.lte = new Date(end);
    }

    const conversations = await prisma.conversation.findMany({
      where: { chatbotId: id, isPreview: false, ...dateFilter },
      include: { interactions: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    });

    const rows = conversations.map((c) => ({
      sessionId: c.sessionId,
      deviceType: c.deviceType,
      pageUrl: c.pageUrl,
      isWeekend: c.isWeekend,
      isWorkHours: c.isWorkHours,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt?.toISOString() || null,
      interactionCount: c.interactions.length,
      interactions: c.interactions.map((i) => ({
        type: i.type,
        stepId: i.stepId,
        stepName: i.stepName,
        content: i.content ? JSON.parse(i.content) : null,
        createdAt: i.createdAt.toISOString(),
      })),
    }));

    if (format === 'csv') {
      const headers = ['sessionId', 'deviceType', 'pageUrl', 'isWeekend', 'isWorkHours', 'startedAt', 'endedAt', 'interactionCount'];
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push([
          row.sessionId,
          row.deviceType || '',
          row.pageUrl || '',
          row.isWeekend,
          row.isWorkHours,
          row.startedAt,
          row.endedAt || '',
          row.interactionCount,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }

      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${id}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
