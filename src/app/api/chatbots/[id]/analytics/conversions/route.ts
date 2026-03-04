import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/analytics/conversions
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

    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = new Date(start);
      if (end) dateFilter.createdAt.lte = new Date(end);
    }

    const events = await prisma.conversionEvent.findMany({
      where: { chatbotId: id, ...dateFilter },
      select: { conversionName: true, conversionType: true },
    });

    const grouped: Record<string, { name: string; type: string; count: number }> = {};
    for (const e of events) {
      const key = `${e.conversionName}__${e.conversionType}`;
      if (!grouped[key]) {
        grouped[key] = { name: e.conversionName, type: e.conversionType, count: 0 };
      }
      grouped[key].count++;
    }

    return NextResponse.json({ data: Object.values(grouped) });
  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
