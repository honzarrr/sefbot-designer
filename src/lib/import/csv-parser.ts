import { v4 as uuidv4 } from 'uuid';
import type { Project, Step, TextBlock } from '@/types';
import { vfColorToHex } from './vf-colors';

export interface CSVParseResult {
  project: Project;
  stats: {
    steps: number;
    rows: number;
  };
}

/**
 * CSV columns:
 *   canvas id, canvas name, block id, block name, block content, block color
 *
 * One row per block. Blocks in the same canvas are grouped into a single Step.
 * No connections (CSV lacks this data).
 * Auto-layout steps in a grid since no position data.
 */
export function parseCSVFile(csvText: string, projectName?: string): CSVParseResult {
  const rows = parseCSVRows(csvText);
  if (rows.length === 0) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Group rows by canvas id (first column)
  const canvasGroups = new Map<string, CSVRow[]>();

  for (const row of rows) {
    const canvasId = row.canvasId;
    const existing = canvasGroups.get(canvasId) || [];
    existing.push(row);
    canvasGroups.set(canvasId, existing);
  }

  // Convert each canvas group to a Step
  const steps: Step[] = [];
  const nodePositions: Record<string, { x: number; y: number }> = {};

  const GRID_COLS = 4;
  const GRID_SPACING_X = 350;
  const GRID_SPACING_Y = 300;

  let index = 0;
  const canvasEntries = Array.from(canvasGroups.entries());
  for (const [, groupRows] of canvasEntries) {
    const firstRow = groupRows[0];
    const stepId = uuidv4();
    const stepName = firstRow.blockName || firstRow.canvasName || 'Unnamed Step';
    const stepColor = vfColorToHex(firstRow.blockColor);

    // Each row becomes a TextBlock with plain text content
    const blocks: TextBlock[] = groupRows.map((row) => ({
      id: uuidv4(),
      type: 'text' as const,
      content: row.blockContent || '',
    }));

    steps.push({
      id: stepId,
      name: stepName,
      color: stepColor,
      blocks,
    });

    // Auto-layout in a grid
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    nodePositions[stepId] = {
      x: 100 + col * GRID_SPACING_X,
      y: 100 + row * GRID_SPACING_Y,
    };
    index++;
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name: projectName || 'CSV Import',
    status: 'draft',
    steps,
    conditions: [],
    softStarts: [],
    notes: [],
    connections: [],
    anchors: [],
    versions: [],
    nodePositions,
    createdAt: now,
    updatedAt: now,
  };

  return {
    project,
    stats: {
      steps: steps.length,
      rows: rows.length,
    },
  };
}

// === CSV parsing internals ===

interface CSVRow {
  canvasId: string;
  canvasName: string;
  blockId: string;
  blockName: string;
  blockContent: string;
  blockColor: string;
}

/**
 * Parse CSV text into structured rows.
 * Handles quoted fields, newlines within quotes, and comma delimiters.
 * Skips the header row.
 */
function parseCSVRows(csvText: string): CSVRow[] {
  const lines = splitCSVLines(csvText);
  if (lines.length <= 1) return []; // Header only or empty

  const rows: CSVRow[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 6) continue; // Skip malformed rows

    rows.push({
      canvasId: fields[0].trim(),
      canvasName: fields[1].trim(),
      blockId: fields[2].trim(),
      blockName: fields[3].trim(),
      blockContent: fields[4].trim(),
      blockColor: fields[5].trim(),
    });
  }

  return rows;
}

/**
 * Split CSV text into logical lines, respecting quoted fields that may contain newlines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      if (current.trim()) {
        lines.push(current);
      }
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // Skip \r
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into an array of field values.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}
