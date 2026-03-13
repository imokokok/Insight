import { createLogger } from '@/lib/utils/logger';
import { exportColors } from '@/lib/config/colors';

export interface ExportOptions {
  format: 'csv' | 'json' | 'png' | 'svg' | 'excel';
  filename?: string;
  includeMetadata?: boolean;
  resolution?: 'standard' | 'high';
  chartTitle?: string;
  dataSource?: string;
  showTimestamp?: boolean;
}

export type Resolution = 'standard' | 'high';

export const RESOLUTION_CONFIG: Record<Resolution, { scale: number; label: string }> = {
  standard: { scale: 2, label: '标准 (2x)' },
  high: { scale: 4, label: '高清 (4x)' },
};

export interface ChartExportData {
  [key: string]: string | number | undefined;
}

export interface ExportMetadata {
  exportedAt: string;
  dataSource?: string;
  timeRange?: string;
  totalRecords?: number;
  [key: string]: string | number | undefined;
}

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';
  progress: number;
  message: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

const logger = createLogger('chartExport');

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToCSV(
  data: ChartExportData[],
  filename: string,
  metadata?: ExportMetadata,
  onProgress?: ExportProgressCallback
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  onProgress?.({ status: 'preparing', progress: 10, message: '准备 CSV 数据...' });

  const batchSize = 10000;
  const totalBatches = Math.ceil(data.length / batchSize);
  const chunks: string[] = [];

  const headers = Object.keys(data[0]);

  if (metadata) {
    chunks.push(`# 导出时间: ${metadata.exportedAt}`);
    if (metadata.dataSource) chunks.push(`# 数据源: ${metadata.dataSource}`);
    if (metadata.timeRange) chunks.push(`# 时间范围: ${metadata.timeRange}`);
    if (metadata.totalRecords !== undefined) chunks.push(`# 总记录数: ${metadata.totalRecords}`);
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
      message: `处理数据 ${end}/${data.length}...`,
    });

    if (i < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.({ status: 'exporting', progress: 95, message: '生成文件...' });

  const csvContent = chunks.join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const sanitizedFilename = sanitizeFilename(filename);

  downloadBlob(blob, `${sanitizedFilename}.csv`);

  onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });
}

export async function exportToJSON(
  data: ChartExportData[] | Record<string, unknown>,
  filename: string,
  metadata?: ExportMetadata,
  onProgress?: ExportProgressCallback
): Promise<void> {
  onProgress?.({ status: 'preparing', progress: 10, message: '准备 JSON 数据...' });

  const exportData = Array.isArray(data) ? data : [data];

  const output = {
    metadata: metadata || {
      exportedAt: new Date().toISOString(),
      totalRecords: Array.isArray(data) ? data.length : 1,
    },
    data: exportData,
  };

  onProgress?.({ status: 'exporting', progress: 50, message: '序列化数据...' });

  const jsonContent = JSON.stringify(output, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const sanitizedFilename = sanitizeFilename(filename);

  onProgress?.({ status: 'exporting', progress: 90, message: '生成文件...' });

  downloadBlob(blob, `${sanitizedFilename}.json`);

  onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });
}

export async function exportToPNG(
  chartElement: HTMLElement,
  filename: string,
  options: {
    backgroundColor?: string;
    scale?: number;
    padding?: number;
    resolution?: Resolution;
    chartTitle?: string;
    dataSource?: string;
    showTimestamp?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<void> {
  const {
    backgroundColor = exportColors.background,
    padding = 20,
    resolution = 'standard',
    chartTitle,
    dataSource,
    showTimestamp = true,
  } = options;

  const scale = RESOLUTION_CONFIG[resolution].scale;

  onProgress?.({ status: 'preparing', progress: 10, message: '准备图表截图...' });

  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found in chart container');
  }

  onProgress?.({ status: 'exporting', progress: 20, message: '克隆 SVG 元素...' });

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgRect = svgElement.getBoundingClientRect();

  const headerHeight = chartTitle ? 60 : 0;
  const footerHeight = showTimestamp ? 40 : 0;

  const totalWidth = svgRect.width + padding * 2;
  const totalHeight = svgRect.height + padding * 2 + headerHeight + footerHeight;

  clone.setAttribute('width', String(svgRect.width * scale));
  clone.setAttribute('height', String(svgRect.height * scale));
  clone.style.backgroundColor = backgroundColor;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (chartTitle) {
    ctx.fillStyle = exportColors.text.primary;
    ctx.font = `bold ${24 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(chartTitle, (totalWidth * scale) / 2, padding * scale + 30 * scale);
  }

  onProgress?.({ status: 'exporting', progress: 40, message: '序列化 SVG...' });

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  onProgress?.({ status: 'exporting', progress: 50, message: '渲染图像...' });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const chartY = padding * scale + headerHeight * scale;
        ctx.drawImage(img, padding * scale, chartY, svgRect.width * scale, svgRect.height * scale);

        if (showTimestamp) {
          const timestampY = chartY + svgRect.height * scale + 25 * scale;
          ctx.fillStyle = exportColors.text.secondary;
          ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'left';

          const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          ctx.fillText(`导出时间: ${timestamp}`, padding * scale, timestampY);

          if (dataSource) {
            ctx.fillStyle = exportColors.text.muted;
            ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.fillText(`数据来源: ${dataSource}`, padding * scale, timestampY + 18 * scale);
          }
        }

        onProgress?.({ status: 'exporting', progress: 80, message: '生成 PNG 文件...' });

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const sanitizedFilename = sanitizeFilename(filename);
              downloadBlob(blob, `${sanitizedFilename}.png`);
              URL.revokeObjectURL(svgUrl);
              onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });
              resolve();
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          },
          'image/png',
          1.0
        );
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = svgUrl;
  });
}

export async function exportToSVG(
  chartElement: HTMLElement,
  filename: string,
  options: {
    backgroundColor?: string;
    includeStyles?: boolean;
    chartTitle?: string;
    dataSource?: string;
    showTimestamp?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<void> {
  const {
    backgroundColor = exportColors.background,
    includeStyles = true,
    chartTitle,
    dataSource,
    showTimestamp = true,
  } = options;

  onProgress?.({ status: 'preparing', progress: 10, message: '准备 SVG 导出...' });

  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found in chart container');
  }

  onProgress?.({ status: 'exporting', progress: 30, message: '克隆 SVG 元素...' });

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgRect = svgElement.getBoundingClientRect();

  const headerHeight = chartTitle ? 60 : 0;
  const footerHeight = showTimestamp ? 40 : 0;
  const padding = 20;

  const totalWidth = svgRect.width + padding * 2;
  const totalHeight = svgRect.height + padding * 2 + headerHeight + footerHeight;

  clone.setAttribute('width', String(totalWidth));
  clone.setAttribute('height', String(totalHeight));

  if (includeStyles) {
    const styleSheets = document.styleSheets;
    let cssText = '';

    try {
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const rules = styleSheets[i].cssRules || styleSheets[i].rules;
          for (let j = 0; j < rules.length; j++) {
            cssText += rules[j].cssText + '\n';
          }
        } catch (e) {
          logger.warn(
            'Failed to access stylesheet rules',
            e instanceof Error ? e : new Error(String(e))
          );
        }
      }
    } catch (e) {
      logger.warn('Failed to extract stylesheets', e instanceof Error ? e : new Error(String(e)));
    }

    if (cssText) {
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = cssText;
      clone.insertBefore(styleElement, clone.firstChild);
    }
  }

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', backgroundColor);
  clone.insertBefore(bgRect, clone.firstChild);

  if (chartTitle) {
    const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    titleGroup.setAttribute('class', 'export-title');

    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', String(totalWidth / 2));
    titleText.setAttribute('y', String(padding + 30));
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    titleText.setAttribute('font-size', '24');
    titleText.setAttribute('font-weight', 'bold');
    titleText.setAttribute('fill', exportColors.text.primary);
    titleText.textContent = chartTitle;
    titleGroup.appendChild(titleText);
    clone.appendChild(titleGroup);
  }

  const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  contentGroup.setAttribute('transform', `translate(${padding}, ${padding + headerHeight})`);

  const children = Array.from(clone.childNodes).filter(
    (node) => node !== bgRect && !(node as Element).classList?.contains('export-title')
  );
  children.forEach((child) => {
    if (child !== contentGroup) {
      contentGroup.appendChild(child);
    }
  });
  clone.appendChild(contentGroup);

  if (showTimestamp) {
    const footerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    footerGroup.setAttribute('class', 'export-footer');

    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const timestampText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timestampText.setAttribute('x', String(padding));
    timestampText.setAttribute('y', String(totalHeight - padding - (dataSource ? 18 : 0)));
    timestampText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    timestampText.setAttribute('font-size', '12');
    timestampText.setAttribute('fill', exportColors.text.secondary);
    timestampText.textContent = `导出时间: ${timestamp}`;
    footerGroup.appendChild(timestampText);

    if (dataSource) {
      const sourceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sourceText.setAttribute('x', String(padding));
      sourceText.setAttribute('y', String(totalHeight - padding));
      sourceText.setAttribute(
        'font-family',
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      );
      sourceText.setAttribute('font-size', '10');
      sourceText.setAttribute('fill', exportColors.text.muted);
      sourceText.textContent = `数据来源: ${dataSource}`;
      footerGroup.appendChild(sourceText);
    }

    clone.appendChild(footerGroup);
  }

  onProgress?.({ status: 'exporting', progress: 60, message: '序列化 SVG...' });

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const svgData = new XMLSerializer().serializeToString(clone);

  onProgress?.({ status: 'exporting', progress: 80, message: '生成文件...' });

  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8;' });
  const sanitizedFilename = sanitizeFilename(filename);

  downloadBlob(blob, `${sanitizedFilename}.svg`);

  onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });
}

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
      await exportToPNG(
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
      break;
    case 'svg':
      if (!chartRef) {
        throw new Error('Chart element reference is required for SVG export');
      }
      await exportToSVG(
        chartRef,
        filename,
        {
          chartTitle,
          dataSource,
          showTimestamp,
        },
        onProgress
      );
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

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
        message: `[${chart.name}] ${progress.message}`,
      });
    };

    await exportChart(
      chart.chartRef,
      chart.data,
      { ...options, filename: chart.name },
      wrappedProgress
    );
  }

  onProgress?.({ status: 'completed', progress: 100, message: '所有图表导出完成' });
}

export function getSupportedExportFormats(): Array<{
  format: ExportOptions['format'];
  label: string;
  description: string;
  requiresChartRef: boolean;
}> {
  return [
    {
      format: 'csv',
      label: 'CSV',
      description: '逗号分隔值文件，适合数据分析',
      requiresChartRef: false,
    },
    {
      format: 'json',
      label: 'JSON',
      description: '结构化数据格式，适合程序处理',
      requiresChartRef: false,
    },
    {
      format: 'excel',
      label: 'Excel',
      description: 'Excel 兼容格式，适合表格处理',
      requiresChartRef: false,
    },
    {
      format: 'png',
      label: 'PNG',
      description: '高清图片格式，适合分享和报告',
      requiresChartRef: true,
    },
    {
      format: 'svg',
      label: 'SVG',
      description: '矢量图形格式，可无损缩放',
      requiresChartRef: true,
    },
  ];
}
