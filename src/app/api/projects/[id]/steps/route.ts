import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]/steps — list all chatbot steps for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const steps = await prisma.chatbotStep.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(steps.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    sourceBlockId: s.sourceBlockId,
    number: s.number,
    name: s.name,
    type: s.type,
    color: s.color,
    output: JSON.parse(s.output),
    input: JSON.parse(s.input),
    jump: JSON.parse(s.jump),
    settings: JSON.parse(s.settings),
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
}
