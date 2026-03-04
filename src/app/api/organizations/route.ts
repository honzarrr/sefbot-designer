import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizations — list all organizations
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({
    include: { _count: { select: { chatbots: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(organizations.map((o) => ({
    id: o.id,
    name: o.name,
    chatbotCount: o._count.chatbots,
    createdAt: o.createdAt.toISOString(),
  })));
}

// POST /api/organizations — create organization
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: { name: name.trim() },
  });

  return NextResponse.json({
    id: org.id,
    name: org.name,
    chatbotCount: 0,
    createdAt: org.createdAt.toISOString(),
  }, { status: 201 });
}
