import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/settings
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    select: { id: true, settings: true },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  return NextResponse.json({
    chatbotId: chatbot.id,
    settings: chatbot.settings ? JSON.parse(chatbot.settings) : {},
  });
}

// PUT /api/chatbots/[id]/settings
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.update({
    where: { id },
    data: { settings: JSON.stringify(body) },
  });

  return NextResponse.json({
    chatbotId: chatbot.id,
    settings: JSON.parse(chatbot.settings!),
    updatedAt: chatbot.updatedAt.toISOString(),
  });
}
