import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

// POST /api/chatbots/[id]/analytics/share — generate shareable report link
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    const chatbot = await prisma.chatbot.findUnique({ where: { id } });
    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    const token = uuid();

    await prisma.analyticsReport.create({
      data: {
        chatbotId: id,
        token,
      },
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
