import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/projects/[id]/connections/[connectionId] — update isHidden, jumpRule
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; connectionId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, connectionId } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { isHidden, jumpRule } = body;

  // Update in DevConnection table if exists
  const devConn = await prisma.devConnection.findUnique({ where: { id: connectionId } });
  if (devConn) {
    const data: Record<string, unknown> = {};
    if (isHidden !== undefined) data.isHidden = isHidden;
    if (jumpRule !== undefined) data.jumpRule = JSON.stringify(jumpRule);

    const updated = await prisma.devConnection.update({
      where: { id: connectionId },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      projectId: updated.projectId,
      sourceId: updated.sourceId,
      targetId: updated.targetId,
      isHidden: updated.isHidden,
      jumpRule: updated.jumpRule ? JSON.parse(updated.jumpRule) : null,
    });
  }

  // Also update in the project JSON data for design-layer connections
  const dbProject = await prisma.project.findUnique({ where: { id } });
  if (!dbProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const projectData = JSON.parse(dbProject.data);
  const connections = projectData.connections || [];
  const connIndex = connections.findIndex((c: { id: string }) => c.id === connectionId);

  if (connIndex === -1) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  if (isHidden !== undefined) connections[connIndex].isHidden = isHidden;
  if (jumpRule !== undefined) connections[connIndex].jumpRule = jumpRule;

  await prisma.project.update({
    where: { id },
    data: { data: JSON.stringify({ ...projectData, connections }) },
  });

  return NextResponse.json(connections[connIndex]);
}
