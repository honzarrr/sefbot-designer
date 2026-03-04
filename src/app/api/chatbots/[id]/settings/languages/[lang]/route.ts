import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/chatbots/[id]/settings/languages/[lang]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; lang: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, lang } = params;

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    select: { settings: true },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  const settings = chatbot.settings ? JSON.parse(chatbot.settings) : {};
  const languages: string[] = settings.languages || [];

  settings.languages = languages.filter((l: string) => l !== lang);

  await prisma.chatbot.update({
    where: { id },
    data: { settings: JSON.stringify(settings) },
  });

  return NextResponse.json({ languages: settings.languages });
}
