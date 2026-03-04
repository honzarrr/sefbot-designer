import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/logs?page=1&search=&start=&end=
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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = 20;
    const search = url.searchParams.get('search') || '';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    const where: Record<string, unknown> = {
      chatbotId: id,
      isPreview: false,
    };

    if (start || end) {
      const startedAt: Record<string, Date> = {};
      if (start) startedAt.gte = new Date(start);
      if (end) startedAt.lte = new Date(end);
      where.startedAt = startedAt;
    }

    if (search) {
      where.OR = [
        { sessionId: { contains: search } },
        { pageUrl: { contains: search } },
        { interactions: { some: { content: { contains: search } } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          interactions: { orderBy: { createdAt: 'asc' } },
          _count: { select: { interactions: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.conversation.count({ where }),
    ]);

    const data = conversations.map((c) => ({
      id: c.id,
      sessionId: c.sessionId,
      deviceType: c.deviceType,
      pageUrl: c.pageUrl,
      isWeekend: c.isWeekend,
      isWorkHours: c.isWorkHours,
      startedAt: c.startedAt.toISOString(),
      endedAt: c.endedAt?.toISOString() || null,
      interactionCount: c._count.interactions,
      interactions: c.interactions.map((i) => ({
        id: i.id,
        type: i.type,
        stepId: i.stepId,
        stepName: i.stepName,
        content: i.content ? JSON.parse(i.content) : null,
        createdAt: i.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching conversation logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
