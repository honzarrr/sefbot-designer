import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/chatbots/[id]/steps/bulk-color — update color for multiple steps
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
  const { stepIds, color } = body;

  if (!Array.isArray(stepIds) || !color) {
    return NextResponse.json({ error: 'stepIds (array) and color are required' }, { status: 400 });
  }

  await prisma.chatbotStep.updateMany({
    where: {
      id: { in: stepIds },
      chatbotId: id,
    },
    data: { color },
  });

  return NextResponse.json({ success: true, updated: stepIds.length });
}
