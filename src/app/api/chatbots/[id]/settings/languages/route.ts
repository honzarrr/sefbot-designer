import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/settings/languages — add a language
export async function POST(
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
  const { language } = body;

  if (!language?.trim()) {
    return NextResponse.json({ error: 'Language code is required' }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    select: { settings: true },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  const settings = chatbot.settings ? JSON.parse(chatbot.settings) : {};
  const languages: string[] = settings.languages || [];

  if (languages.includes(language.trim())) {
    return NextResponse.json({ error: 'Language already exists' }, { status: 400 });
  }

  languages.push(language.trim());
  settings.languages = languages;

  await prisma.chatbot.update({
    where: { id },
    data: { settings: JSON.stringify(settings) },
  });

  return NextResponse.json({ languages }, { status: 201 });
}
