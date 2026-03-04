import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/chatbots/[id]/conversions — log conversion event (public widget endpoint)
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
    const { conversationId, conversionName, conversionType, metadata } = body;

    if (!conversationId || !conversionName || !conversionType) {
      return NextResponse.json(
        { error: 'conversationId, conversionName, and conversionType are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const event = await prisma.conversionEvent.create({
      data: {
        conversationId,
        chatbotId: id,
        conversionName,
        conversionType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      id: event.id,
      conversionName: event.conversionName,
      createdAt: event.createdAt.toISOString(),
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error logging conversion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
