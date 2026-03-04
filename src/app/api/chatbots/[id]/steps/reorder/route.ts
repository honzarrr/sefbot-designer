import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/chatbots/[id]/steps/reorder — reorder steps
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
  const { order } = body; // Array of { id: string, sortOrder: number }

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order must be an array of { id, sortOrder }' }, { status: 400 });
  }

  await prisma.$transaction(
    order.map((item: { id: string; sortOrder: number }) =>
      prisma.chatbotStep.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  const steps = await prisma.chatbotStep.findMany({
    where: { chatbotId: id },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(steps.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
  })));
}
