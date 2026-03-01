import * as XLSX from 'xlsx';
import type { Project } from '@/types';

export function exportProjectToExcel(project: Project): void {
  const rows: (string | undefined)[][] = [];

  // Header row
  rows.push(['Step Name', 'Text Content', 'Button 1', 'Button 2', 'Button 3', 'Button 4', 'Button 5']);

  project.steps.forEach((step) => {
    const textBlocks = step.blocks
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.content.replace(/<[^>]*>/g, '') : ''));

    const textContent = textBlocks.join('\n') || '';

    const buttonsBlock = step.blocks.find((b) => b.type === 'buttons');
    const buttonLabels: string[] = [];
    if (buttonsBlock && buttonsBlock.type === 'buttons') {
      buttonsBlock.buttons.forEach((btn) => {
        buttonLabels.push(btn.label);
      });
    }

    const userInputBlock = step.blocks.find((b) => b.type === 'user-input');
    let finalText = textContent;
    if (userInputBlock && userInputBlock.type === 'user-input') {
      finalText += (finalText ? '\n' : '') + `[User Input: ${userInputBlock.placeholder || 'text'}]`;
    }

    rows.push([
      step.name,
      finalText,
      buttonLabels[0],
      buttonLabels[1],
      buttonLabels[2],
      buttonLabels[3],
      buttonLabels[4],
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Step Name
    { wch: 40 }, // Text Content
    { wch: 15 }, // Buttons
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Steps');

  // Add conditions sheet if any
  if (project.conditions.length > 0) {
    const condRows: string[][] = [['Condition ID', 'Branch Label']];
    project.conditions.forEach((cond) => {
      cond.conditions.forEach((branch) => {
        condRows.push([cond.id.slice(0, 8), branch.label]);
      });
    });
    const condWs = XLSX.utils.aoa_to_sheet(condRows);
    condWs['!cols'] = [{ wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, condWs, 'Conditions');
  }

  XLSX.writeFile(wb, `${project.name}.xlsx`);
}
