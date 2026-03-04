import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseVFFile } from '@/lib/import/vf-parser';
import type { VFFile } from '@/lib/import/types';

// POST /api/import/vf — upload single .vf file, parse, create project
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.vf')) {
      return NextResponse.json({ error: 'File must be a .vf file' }, { status: 400 });
    }

    const text = await file.text();
    let vfJson: VFFile;

    try {
      vfJson = JSON.parse(text) as VFFile;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in .vf file' }, { status: 400 });
    }

    const result = parseVFFile(vfJson);
    const { project: parsedProject, stats } = result;

    // Store project data (without id, name, status - those go in columns)
    const projectData = {
      steps: parsedProject.steps,
      conditions: parsedProject.conditions,
      softStarts: parsedProject.softStarts,
      notes: parsedProject.notes,
      connections: parsedProject.connections,
      anchors: parsedProject.anchors,
      versions: [],
      nodePositions: parsedProject.nodePositions,
    };

    const dbProject = await prisma.project.create({
      data: {
        name: parsedProject.name,
        status: 'PROGRESS',
        data: JSON.stringify(projectData),
      },
    });

    // Create import log entry
    await prisma.import.create({
      data: {
        projectId: dbProject.id,
        source: 'VOICEFLOW_VF',
        fileName: file.name,
        status: 'COMPLETED',
        log: JSON.stringify(stats),
      },
    });

    return NextResponse.json({
      projectId: dbProject.id,
      projectName: parsedProject.name,
      fileName: file.name,
      stats,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Import failed: ${message}` }, { status: 500 });
  }
}
