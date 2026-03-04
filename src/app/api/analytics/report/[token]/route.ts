import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/analytics/report/[token] — public analytics endpoint (no auth)
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const report = await prisma.analyticsReport.findUnique({
      where: { token },
      include: { chatbot: { select: { id: true, name: true } } },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.expiresAt && report.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Report link expired' }, { status: 410 });
    }

    const chatbotId = report.chatbotId;
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';

    const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 86400000);
    const dateFilter = { startedAt: { gte: startDate } };
    const where = { chatbotId, isPreview: false, ...dateFilter };

    const [
      totalConversations,
      conversations,
      emailInteractions,
      phoneInteractions,
      faqInteractions,
      allConversations,
      conversionEvents,
    ] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        select: { startedAt: true, endedAt: true },
      }),
      prisma.conversationInteraction.count({
        where: { conversation: where, type: 'email_collected' },
      }),
      prisma.conversationInteraction.count({
        where: { conversation: where, type: 'phone_collected' },
      }),
      prisma.conversationInteraction.count({
        where: { conversation: where, type: 'faq_view' },
      }),
      prisma.conversation.findMany({
        where,
        select: { startedAt: true, deviceType: true, pageUrl: true, isWorkHours: true, isWeekend: true },
      }),
      prisma.conversionEvent.findMany({
        where: { chatbotId, createdAt: { gte: startDate } },
        select: { conversionName: true, conversionType: true },
      }),
    ]);

    // Summary
    const completedConversations = conversations.filter((c) => c.endedAt);
    const avgDurationMs = completedConversations.length > 0
      ? completedConversations.reduce((sum, c) => sum + (c.endedAt!.getTime() - c.startedAt.getTime()), 0) / completedConversations.length
      : 0;

    // Time series
    const dailyMap = new Map<string, number>();
    const current = new Date(startDate);
    const now = new Date();
    while (current <= now) {
      dailyMap.set(current.toISOString().split('T')[0], 0);
      current.setDate(current.getDate() + 1);
    }
    for (const conv of allConversations) {
      const dateKey = conv.startedAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    }

    // Devices
    const deviceCounts: Record<string, number> = {};
    for (const c of allConversations) {
      const d = c.deviceType || 'unknown';
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    }

    // URLs
    const urlCounts: Record<string, number> = {};
    for (const c of allConversations) {
      if (c.pageUrl) urlCounts[c.pageUrl] = (urlCounts[c.pageUrl] || 0) + 1;
    }

    // Work hours / weekends
    let workHoursCount = 0, outsideWorkHoursCount = 0, weekdayCount = 0, weekendCount = 0;
    for (const c of allConversations) {
      if (c.isWorkHours) workHoursCount++; else outsideWorkHoursCount++;
      if (c.isWeekend) weekendCount++; else weekdayCount++;
    }

    // Conversions
    const convGrouped: Record<string, { name: string; type: string; count: number }> = {};
    for (const e of conversionEvents) {
      const key = `${e.conversionName}__${e.conversionType}`;
      if (!convGrouped[key]) convGrouped[key] = { name: e.conversionName, type: e.conversionType, count: 0 };
      convGrouped[key].count++;
    }

    return NextResponse.json({
      chatbot: report.chatbot,
      summary: {
        opens: totalConversations,
        uniqueSessions: totalConversations,
        emailsCollected: emailInteractions,
        phonesCollected: phoneInteractions,
        faqViews: faqInteractions,
        avgDurationSeconds: Math.round(avgDurationMs / 1000),
      },
      timeSeries: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, conversations: count })),
      devices: Object.entries(deviceCounts).map(([device, count]) => ({ device, count })),
      urls: Object.entries(urlCounts).map(([pageUrl, count]) => ({ pageUrl, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      workHours: [
        { label: 'During work hours', count: workHoursCount },
        { label: 'Outside work hours', count: outsideWorkHoursCount },
      ],
      weekends: [
        { label: 'Weekday', count: weekdayCount },
        { label: 'Weekend', count: weekendCount },
      ],
      conversions: Object.values(convGrouped),
    });
  } catch (error) {
    console.error('Error fetching public report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
