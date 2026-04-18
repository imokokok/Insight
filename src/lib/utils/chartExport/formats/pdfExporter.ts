/**
 * @fileoverview PDF format export
 * @description Handles PDF format chart export
 */

import { createLogger } from '@/lib/utils/logger';

import { blobToBase64 } from '../utils/exportHelpers';

import { exportToPNG } from './imageExporter';

import type { PDFExportOptions, ExportProgressCallback } from '../types';
import type { jsPDF } from 'jspdf';

const logger = createLogger('pdfExporter');

let jsPDFModule: typeof jsPDF | null = null;
let jsPDFAutoTable: ((doc: jsPDF, options: Record<string, unknown>) => void) | null = null;

async function getJsPDF() {
  if (!jsPDFModule) {
    const { default: JsPDF } = await import('jspdf');
    jsPDFModule = JsPDF;
  }
  return jsPDFModule;
}

async function getJsPDFAutoTable() {
  if (!jsPDFAutoTable) {
    const autoTable = await import('jspdf-autotable');
    jsPDFAutoTable = autoTable.default;
  }
  return jsPDFAutoTable;
}

/**
 * Export as PDF format
 */
export async function exportToPDF(
  options: PDFExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const { filename, charts, includeWatermark = true, includeMetadata = true, metadata } = options;

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingPDF' });

  const JsPDF = await getJsPDF();
  const doc = new JsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];

    if (i > 0) {
      doc.addPage();
    }

    onProgress?.({
      status: 'exporting',
      progress: 10 + Math.floor((i / charts.length) * 70),
      messageKey: 'export.progress.processingChart',
      messageParams: { current: i + 1, total: charts.length, title: chart.title },
    });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(chart.title, margin, margin);

    if (chart.chartRef) {
      try {
        const pngBlob = await exportToPNG(
          chart.chartRef,
          'temp',
          {
            resolution: 'standard',
            chartTitle: '',
            showTimestamp: false,
            watermark: includeWatermark,
          },
          undefined
        );

        const imageData = await blobToBase64(pngBlob);
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (imgWidth * 9) / 16;

        doc.addImage(imageData, 'PNG', margin, margin + 10, imgWidth, imgHeight);
      } catch (error) {
        logger.warn('Failed to add chart image to PDF', error as Error);
      }
    }

    if (chart.data.length > 0 && chart.data.length <= 50) {
      const tableStartY = margin + 100;
      const headers = Object.keys(chart.data[0]);
      const rows = chart.data.map((row) => headers.map((h) => String(row[h] || '')));

      const autoTable = await getJsPDFAutoTable();
      autoTable(doc, {
        head: [headers],
        body: rows.slice(0, 20),
        startY: tableStartY,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    const footerY = pageHeight - margin;
    doc.text(`Page ${i + 1} / ${charts.length}`, pageWidth / 2, footerY, { align: 'center' });

    if (includeMetadata && metadata) {
      const metadataText = `Exported: ${new Date(metadata.exportedAt).toLocaleString('en-US')}`;
      doc.text(metadataText, margin, footerY);

      if (metadata.dataSource) {
        doc.text(`Data Source: ${metadata.dataSource}`, margin, footerY - 5);
      }
    }

    if (includeWatermark) {
      doc.saveGraphicsState();
      doc.setGState(
        new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({
          opacity: 0.1,
        })
      );
      doc.setFontSize(40);
      doc.setTextColor(128, 128, 128);
      doc.text('Insight Analytics', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
      doc.restoreGraphicsState();
    }
  }

  onProgress?.({ status: 'exporting', progress: 90, messageKey: 'export.progress.savingPDF' });

  doc.save(`${filename}.pdf`);

  onProgress?.({ status: 'completed', progress: 100, messageKey: 'export.progress.pdfCompleted' });
}
