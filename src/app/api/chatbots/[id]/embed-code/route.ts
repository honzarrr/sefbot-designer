import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/embed-code — generate embed snippet
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
    select: { id: true, name: true, settings: true },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  const embedCode = `<!-- Sefbot Chatbot Widget -->
<script src="https://app.sefbot.cz/embed/sefbot-widget.js" data-chatbot-id="${chatbot.id}"></script>`;

  return NextResponse.json({
    chatbotId: chatbot.id,
    chatbotName: chatbot.name,
    embedCode,
  });
}
