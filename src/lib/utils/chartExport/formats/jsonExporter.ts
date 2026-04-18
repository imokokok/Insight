/**
 * @fileoverview JSON format export
 * @description Handle JSON format chart data export
 */

import { sanitizeFilename, downloadBlob } from '../utils/exportHelpers';

import type { ChartExportData, ExportMetadata, ExportProgressCallback } from '../types';

/**
 * Export data as JSON format
 */
export async function exportToJSON(
  data: ChartExportData[] | Record<string, unknown>,
  filename: string,
  metadata?: ExportMetadata,
  onProgress?: ExportProgressCallback
): Promise<void> {
  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingJSON' });

  const exportData = Array.isArray(data) ? data : [data];

  const output = {
    metadata: metadata || {
      exportedAt: new Date().toISOString(),
      totalRecords: Array.isArray(data) ? data.length : 1,
    },
    data: exportData,
  };

  onProgress?.({
    status: 'exporting',
    progress: 50,
    messageKey: 'export.progress.serializingData',
  });

  const jsonContent = JSON.stringify(output, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const sanitizedFilename = sanitizeFilename(filename);

  onProgress?.({ status: 'exporting', progress: 90, messageKey: 'export.progress.generatingFile' });

  downloadBlob(blob, `${sanitizedFilename}.json`);

  onProgress?.({ status: 'completed', progress: 100, messageKey: 'export.progress.completed' });
}
