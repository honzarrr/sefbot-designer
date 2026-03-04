import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/projects/[id]/status — change kanban status
export async function PATCH(
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
  const { status } = body;

  const validStatuses = ['draft', 'design_review', 'approved', 'development', 'testing', 'live'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: { status: status.toUpperCase() },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status.toLowerCase(),
    updatedAt: project.updatedAt.toISOString(),
  });
}
