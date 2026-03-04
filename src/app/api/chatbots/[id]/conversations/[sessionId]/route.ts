import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// PATCH /api/chatbots/[id]/conversations/[sessionId] — end conversation (public widget endpoint)
export async function PATCH(
  _req: NextRequest,
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

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { endedAt: new Date() },
    });

    return NextResponse.json({
      id: updated.id,
      sessionId: updated.sessionId,
      endedAt: updated.endedAt?.toISOString(),
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error ending conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
