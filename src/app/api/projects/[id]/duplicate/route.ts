import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/projects/[id]/duplicate — duplicate a project
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const source = await prisma.project.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const data = JSON.parse(source.data);
  // Clear versions in the duplicate
  data.versions = [];

  const duplicate = await prisma.project.create({
    data: {
      name: `${source.name} (copy)`,
      status: source.status,
      data: JSON.stringify(data),
    },
  });

  return NextResponse.json({
    id: duplicate.id,
    name: duplicate.name,
    status: duplicate.status.toLowerCase(),
    createdAt: duplicate.createdAt.toISOString(),
    updatedAt: duplicate.updatedAt.toISOString(),
  }, { status: 201 });
}
