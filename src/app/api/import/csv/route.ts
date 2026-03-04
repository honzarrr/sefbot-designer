import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCSVFile } from '@/lib/import/csv-parser';

// POST /api/import/csv — upload CSV file, parse, create project
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

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a .csv file' }, { status: 400 });
    }

    const text = await file.text();
    const projectName = file.name.replace(/\.csv$/i, '');

    const result = parseCSVFile(text, projectName);
    const { project: parsedProject, stats } = result;

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
        source: 'VOICEFLOW_CSV',
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
