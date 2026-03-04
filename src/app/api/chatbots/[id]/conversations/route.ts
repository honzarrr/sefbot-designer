import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/chatbots/[id]/conversations — start a new conversation (public widget endpoint)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const chatbot = await prisma.chatbot.findUnique({ where: { id } });
    if (!chatbot || !chatbot.active || chatbot.deletedAt) {
      return NextResponse.json(
        { error: 'Chatbot not found or inactive' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { deviceType, pageUrl, isPreview } = body;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Determine weekend/work hours from chatbot settings
    let workHoursDays = [1, 2, 3, 4, 5];
    let workHoursStart = 8;
    let workHoursEnd = 17;

    if (chatbot.settings) {
      const settings = JSON.parse(chatbot.settings);
      if (settings.workHours) {
        if (settings.workHours.days) workHoursDays = settings.workHours.days;
        if (settings.workHours.start) workHoursStart = parseInt(settings.workHours.start.split(':')[0], 10);
        if (settings.workHours.end) workHoursEnd = parseInt(settings.workHours.end.split(':')[0], 10);
      }
    }

    const isWeekend = !workHoursDays.includes(dayOfWeek);
    const isWorkHours = workHoursDays.includes(dayOfWeek) && hour >= workHoursStart && hour < workHoursEnd;

    const sessionId = uuid();

    const conversation = await prisma.conversation.create({
      data: {
        chatbotId: id,
        sessionId,
        deviceType: deviceType || null,
        pageUrl: pageUrl || null,
        isWeekend,
        isWorkHours,
        isPreview: isPreview || false,
      },
    });

    return NextResponse.json({
      id: conversation.id,
      sessionId: conversation.sessionId,
      startedAt: conversation.startedAt.toISOString(),
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
