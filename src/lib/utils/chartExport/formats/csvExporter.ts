/**
 * @fileoverview CSV format export
 * @description Handle CSV format chart data export
 */

import { sanitizeFilename, downloadBlob } from '../utils/exportHelpers';

import type { ChartExportData, ExportMetadata, ExportProgressCallback } from '../types';

/**
 * Export data as CSV format
 */
export async function exportToCSV(
  data: ChartExportData[],
  filename: string,
  metadata?: ExportMetadata,
  onProgress?: ExportProgressCallback
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingCSV' });

  const batchSize = 10000;
  const totalBatches = Math.ceil(data.length / batchSize);
  const chunks: string[] = [];

  const headers = Object.keys(data[0]);

  if (metadata) {
    chunks.push(`# Exported At: ${metadata.exportedAt}`);
    if (metadata.dataSource) chunks.push(`# Data Source: ${metadata.dataSource}`);
    if (metadata.timeRange) chunks.push(`# Time Range: ${metadata.timeRange}`);
    if (metadata.totalRecords !== undefined)
      chunks.push(`# Total Records: ${metadata.totalRecords}`);
    chunks.push('#');
  }

  chunks.push(headers.join(','));

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);

    const rows = batch.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === undefined || value === null) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(',')
    );

    chunks.push(...rows);

    const progress = 10 + Math.floor((i / totalBatches) * 80);
    onProgress?.({
      status: 'exporting',
      progress,
      messageKey: 'export.progress.processingData',
      messageParams: { current: end, total: data.length },
    });

    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.({ status: 'exporting', progress: 95, messageKey: 'export.progress.generatingFile' });

  const csvContent = chunks.join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const sanitizedFilename = sanitizeFilename(filename);

  downloadBlob(blob, `${sanitizedFilename}.csv`);

  onProgress?.({ status: 'completed', progress: 100, messageKey: 'export.progress.completed' });
}
