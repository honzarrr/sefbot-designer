import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// POST /api/chatbots/[id]/preview-link — generate a preview token
export async function POST(
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
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  // Generate a token and store the preview as a version
  const token = randomBytes(32).toString('hex');

  const snapshot = {
    name: chatbot.name,
    settings: chatbot.settings ? JSON.parse(chatbot.settings) : null,
    steps: chatbot.steps.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      type: s.type,
      color: s.color,
      output: JSON.parse(s.output),
      input: JSON.parse(s.input),
      jump: JSON.parse(s.jump),
      settings: JSON.parse(s.settings),
      sortOrder: s.sortOrder,
    })),
  };

  await prisma.chatbotVersion.create({
    data: {
      chatbotId: id,
      snapshot: JSON.stringify(snapshot),
      changes: `preview:${token}`,
      createdBy: session.user.id!,
    },
  });

  return NextResponse.json({
    token,
    previewUrl: `/api/preview/${token}`,
  }, { status: 201 });
}
