import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transformDesignerToDevelopment } from '@/lib/transform/designer-to-development';
import type { Project } from '@/types';

// GET /api/projects/[id]/validate — dry-run transformation, return warnings only
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const dbProject = await prisma.project.findUnique({ where: { id } });
  if (!dbProject) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const data = JSON.parse(dbProject.data);
  const project: Project = {
    id: dbProject.id,
    name: dbProject.name,
    status: dbProject.status.toLowerCase() as Project['status'],
    steps: data.steps || [],
    conditions: data.conditions || [],
    softStarts: data.softStarts || [],
    notes: data.notes || [],
    connections: data.connections || [],
    anchors: data.anchors || [],
    versions: data.versions || [],
    nodePositions: data.nodePositions || {},
    createdAt: dbProject.createdAt.toISOString(),
    updatedAt: dbProject.updatedAt.toISOString(),
  };

  const result = transformDesignerToDevelopment(project);

  return NextResponse.json({
    stepsCount: result.steps.length,
    connectionsCount: result.connections.length,
    warnings: result.warnings,
  });
}
