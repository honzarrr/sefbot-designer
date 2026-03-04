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

// POST /api/chatbots/[id]/conversations/[sessionId]/interactions — log interaction (public widget endpoint)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const { id, sessionId } = params;

    const conversation = await prisma.conversation.findFirst({
      where: { chatbotId: id, sessionId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { stepId, stepName, type, content } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const interaction = await prisma.conversationInteraction.create({
      data: {
        conversationId: conversation.id,
        stepId: stepId || null,
        stepName: stepName || null,
        type,
        content: content ? JSON.stringify(content) : null,
      },
    });

    return NextResponse.json({
      id: interaction.id,
      type: interaction.type,
      createdAt: interaction.createdAt.toISOString(),
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error logging interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
