import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseVFFile } from '@/lib/import/vf-parser';
import type { VFFile } from '@/lib/import/types';

interface BatchResult {
  fileName: string;
  projectId: string | null;
  status: 'success' | 'failed';
  stepCount: number;
  connectionCount: number;
  error?: string;
}

// POST /api/import/batch — upload multiple .vf files, process sequentially
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: BatchResult[] = [];
    let imported = 0;
    let failed = 0;

    // Process sequentially to avoid memory issues with large files
    for (const file of files) {
      if (!file.name.endsWith('.vf')) {
        results.push({
          fileName: file.name,
          projectId: null,
          status: 'failed',
          stepCount: 0,
          connectionCount: 0,
          error: 'Not a .vf file',
        });
        failed++;
        continue;
      }

      try {
        const text = await file.text();
        let vfJson: VFFile;

        try {
          vfJson = JSON.parse(text) as VFFile;
        } catch {
          results.push({
            fileName: file.name,
            projectId: null,
            status: 'failed',
            stepCount: 0,
            connectionCount: 0,
            error: 'Invalid JSON',
          });
          failed++;
          continue;
        }

        const parseResult = parseVFFile(vfJson);
        const { project: parsedProject, stats } = parseResult;

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

        results.push({
          fileName: file.name,
          projectId: dbProject.id,
          status: 'success',
          stepCount: stats.steps,
          connectionCount: stats.connections,
        });
        imported++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Try to log the failed import (without project reference since it wasn't created)
        results.push({
          fileName: file.name,
          projectId: null,
          status: 'failed',
          stepCount: 0,
          connectionCount: 0,
          error: message,
        });
        failed++;
      }
    }

    return NextResponse.json({
      total: files.length,
      imported,
      failed,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Batch import failed: ${message}` }, { status: 500 });
  }
}
