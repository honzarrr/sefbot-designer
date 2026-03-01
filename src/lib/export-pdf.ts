import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportCanvasToPDF(projectName: string): Promise<void> {
  // Find the React Flow viewport element
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    throw new Error('Canvas viewport not found');
  }

  const canvas = await html2canvas(viewport, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Determine PDF orientation based on canvas aspect ratio
  const landscape = imgWidth > imgHeight;
  const pdf = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(`${projectName}.pdf`);
}
