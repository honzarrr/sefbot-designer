import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chatbots/[id]/versions — list versions
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const versions = await prisma.chatbotVersion.findMany({
    where: { chatbotId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(versions.map((v) => ({
    id: v.id,
    chatbotId: v.chatbotId,
    snapshot: JSON.parse(v.snapshot),
    changes: v.changes,
    createdBy: v.createdBy,
    createdAt: v.createdAt.toISOString(),
  })));
}

// POST /api/chatbots/[id]/versions — create a version snapshot
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
  const { changes } = body;

  // Take a snapshot of the current chatbot state
  const chatbot = await prisma.chatbot.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

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

  const version = await prisma.chatbotVersion.create({
    data: {
      chatbotId: id,
      snapshot: JSON.stringify(snapshot),
      changes: changes || null,
      createdBy: session.user.id!,
    },
  });

  return NextResponse.json({
    id: version.id,
    chatbotId: version.chatbotId,
    snapshot,
    changes: version.changes,
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
  }, { status: 201 });
}
