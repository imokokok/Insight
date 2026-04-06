/**
 * @fileoverview ZIP批量导出
 * @description 处理多种格式的批量导出
 */

import { createLogger } from '@/lib/utils/logger';

import { sanitizeFilename, downloadBlob, convertToCSV } from '../utils/exportHelpers';

import { exportToPNG, exportToSVG } from './imageExporter';

import type { ZIPExportOptions, ExportProgressCallback } from '../types';

const logger = createLogger('zipExporter');

/**
 * 批量导出为ZIP格式
 */
export async function exportToZIP(
  options: ZIPExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const { filename, charts, settings } = options;

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingBatch' });

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const progress = 10 + Math.floor((i / charts.length) * 80);

    onProgress?.({
      status: 'exporting',
      progress,
      messageKey: 'export.progress.exportingChart',
      messageParams: { current: i + 1, total: charts.length, name: chart.name },
    });

    try {
      if (settings.format === 'png' && chart.chartRef) {
        const blob = await exportToPNG(
          chart.chartRef,
          chart.name,
          {
            resolution: settings.resolution,
            chartTitle: chart.title,
            showTimestamp: true,
          },
          undefined
        );
        zip.file(`${sanitizeFilename(chart.name)}.png`, blob);
      } else if (settings.format === 'svg' && chart.chartRef) {
        const blob = await exportToSVG(
          chart.chartRef,
          chart.name,
          {
            chartTitle: chart.title,
            showTimestamp: true,
          },
          undefined
        );
        zip.file(`${sanitizeFilename(chart.name)}.svg`, blob);
      } else if (settings.format === 'csv') {
        const csvContent = convertToCSV(chart.data);
        zip.file(`${sanitizeFilename(chart.name)}.csv`, csvContent);
      } else if (settings.format === 'json') {
        const jsonContent = JSON.stringify(chart.data, null, 2);
        zip.file(`${sanitizeFilename(chart.name)}.json`, jsonContent);
      }
    } catch (error) {
      logger.warn(`Failed to export chart ${chart.name}`, error as Error);
    }
  }

  onProgress?.({ status: 'exporting', progress: 95, messageKey: 'export.progress.generatingZIP' });

  const content = await zip.generateAsync({ type: 'blob' });
  const sanitizedFilename = sanitizeFilename(filename);
  downloadBlob(content, `${sanitizedFilename}.zip`);

  onProgress?.({
    status: 'completed',
    progress: 100,
    messageKey: 'export.progress.batchCompleted',
  });
}
