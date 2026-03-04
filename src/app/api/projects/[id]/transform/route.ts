import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transformDesignerToDevelopment } from '@/lib/transform/designer-to-development';
import type { Project, Connection } from '@/types';

// POST /api/projects/[id]/transform — run transformation
export async function POST(
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

  if (dbProject.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Project must be in APPROVED status to transform' },
      { status: 400 }
    );
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

  // Create version snapshot before transformation
  await prisma.projectVersion.create({
    data: {
      name: `Pre-transform snapshot`,
      snapshot: dbProject.data,
      projectId: id,
      createdBy: session.user.id!,
    },
  });

  // Run transformation
  const result = transformDesignerToDevelopment(project);

  // Save ChatbotSteps to DB
  for (const step of result.steps) {
    await prisma.chatbotStep.create({
      data: {
        projectId: id,
        sourceBlockId: step.sourceBlockId,
        number: step.number,
        name: step.name,
        type: step.type,
        color: step.color,
        output: JSON.stringify(step.output),
        input: JSON.stringify(step.input),
        jump: JSON.stringify(step.jump),
        settings: JSON.stringify(step.settings),
        sortOrder: step.number,
      },
    });
  }

  // Save development-layer connections to DevConnection table
  for (const conn of result.connections) {
    await prisma.devConnection.create({
      data: {
        projectId: id,
        sourceId: conn.sourceId,
        sourceHandleId: conn.sourceHandleId || null,
        targetId: conn.targetId,
        label: conn.label || null,
        color: conn.color || null,
        layer: conn.layer || 'development',
        jumpRule: conn.jumpRule ? JSON.stringify(conn.jumpRule) : null,
        isHidden: false,
      },
    });
  }

  // Also add dev connections to project data so canvas can display them
  const updatedConnections: Connection[] = [
    ...project.connections,
    ...result.connections,
  ];

  const updatedData = {
    ...data,
    connections: updatedConnections,
  };

  // Update project status to DEVELOPMENT
  await prisma.project.update({
    where: { id },
    data: {
      status: 'DEVELOPMENT',
      data: JSON.stringify(updatedData),
    },
  });

  return NextResponse.json({
    stepsCreated: result.steps.length,
    connectionsCreated: result.connections.length,
    warnings: result.warnings,
  });
}
