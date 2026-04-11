/**
 * @fileoverview 图表导出主模块
 * @description 提供统一的图表导出API，支持多种格式
 */

import { createLogger } from '@/lib/utils/logger';

import { exportToCSV } from './chartExport/formats/csvExporter';
import { exportToPNG, exportToSVG } from './chartExport/formats/imageExporter';
import { exportToJSON } from './chartExport/formats/jsonExporter';
import { exportToPDF } from './chartExport/formats/pdfExporter';
import { exportToZIP } from './chartExport/formats/zipExporter';
import { sanitizeFilename, downloadBlob } from './chartExport/utils/exportHelpers';

import type {
  ExportOptions,
  ExportProgressCallback,
  ExportMetadata,
  ChartExportData,
} from './chartExport/types';

const logger = createLogger('chartExport');

export type {
  ExportOptions,
  ExportSettings,
  ExportMetadata,
  ExportProgress,
  ExportProgressCallback,
  ChartExportData,
  PDFExportOptions,
  BatchExportItem,
  ZIPExportOptions,
  Resolution,
  ExportRange,
} from './chartExport/types';

export { RESOLUTION_CONFIG } from './chartExport/types';

/**
 * 导出单个图表
 */
export async function exportChart(
  chartRef: HTMLElement | null,
  data: ChartExportData[],
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const {
    format,
    filename = 'chart-export',
    includeMetadata = true,
    resolution = 'standard',
    chartTitle,
    dataSource,
    showTimestamp = true,
  } = options;

  const metadata: ExportMetadata | undefined = includeMetadata
    ? {
        exportedAt: new Date().toISOString(),
        totalRecords: data.length,
        dataSource,
      }
    : undefined;

  try {
    switch (format) {
      case 'csv':
        await exportToCSV(data, filename, metadata, onProgress);
        break;

      case 'json':
        await exportToJSON(data, filename, metadata, onProgress);
        break;

      case 'excel':
        await exportToCSV(data, filename, metadata, onProgress);
        break;

      case 'png':
        if (!chartRef) {
          throw new Error('Chart element reference is required for PNG export');
        }
        {
          const blob = await exportToPNG(
            chartRef,
            filename,
            {
              resolution,
              chartTitle,
              dataSource,
              showTimestamp,
            },
            onProgress
          );
          const sanitizedFilename = sanitizeFilename(filename);
          downloadBlob(blob, `${sanitizedFilename}.png`);
        }
        break;

      case 'svg':
        if (!chartRef) {
          throw new Error('Chart element reference is required for SVG export');
        }
        {
          const blob = await exportToSVG(
            chartRef,
            filename,
            {
              chartTitle,
              dataSource,
              showTimestamp,
            },
            onProgress
          );
          const sanitizedFilename = sanitizeFilename(filename);
          downloadBlob(blob, `${sanitizedFilename}.svg`);
        }
        break;

      case 'pdf':
        await exportToPDF(
          {
            filename,
            charts: [
              {
                chartRef,
                data,
                title: chartTitle || '图表',
              },
            ],
            includeMetadata,
            metadata,
          },
          onProgress
        );
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    logger.error(
      `Failed to export chart as ${format}`,
      error instanceof Error ? error : new Error(String(error)),
      { filename, format }
    );
    throw error;
  }
}

/**
 * 批量导出多个图表
 */
export async function exportMultipleCharts(
  charts: Array<{
    chartRef: HTMLElement | null;
    data: ChartExportData[];
    name: string;
  }>,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const totalCharts = charts.length;

  for (let i = 0; i < totalCharts; i++) {
    const chart = charts[i];
    const chartProgress = Math.floor((i / totalCharts) * 100);

    const wrappedProgress: ExportProgressCallback = (progress) => {
      onProgress?.({
        ...progress,
        progress: chartProgress + progress.progress / totalCharts,
        messageKey: 'export.progress.chartPrefix',
        messageParams: { name: chart.name, messageKey: progress.messageKey },
      });
    };

    await exportChart(
      chart.chartRef,
      chart.data,
      { ...options, filename: chart.name },
      wrappedProgress
    );
  }

  onProgress?.({
    status: 'completed',
    progress: 100,
    messageKey: 'export.progress.allChartsCompleted',
  });
}

/**
 * 获取支持的导出格式列表
 */
export function getSupportedExportFormats(): Array<{
  format: ExportOptions['format'];
  label: string;
  descriptionKey: string;
  requiresChartRef: boolean;
}> {
  return [
    {
      format: 'csv',
      label: 'CSV',
      descriptionKey: 'export.formats.csvDescription',
      requiresChartRef: false,
    },
    {
      format: 'json',
      label: 'JSON',
      descriptionKey: 'export.formats.jsonDescription',
      requiresChartRef: false,
    },
    {
      format: 'excel',
      label: 'Excel',
      descriptionKey: 'export.formats.excelDescription',
      requiresChartRef: false,
    },
    {
      format: 'png',
      label: 'PNG',
      descriptionKey: 'export.formats.pngDescription',
      requiresChartRef: true,
    },
    {
      format: 'svg',
      label: 'SVG',
      descriptionKey: 'export.formats.svgDescription',
      requiresChartRef: true,
    },
    {
      format: 'pdf',
      label: 'PDF',
      descriptionKey: 'export.formats.pdfDescription',
      requiresChartRef: true,
    },
  ];
}

export { exportToCSV, exportToJSON, exportToPNG, exportToSVG, exportToPDF, exportToZIP };
