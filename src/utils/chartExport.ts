import { createLogger } from '@/lib/utils/logger';
import { exportColors } from '@/lib/config/colors';

// 动态导入 jsPDF，避免 SSR 问题
let jsPDFModule: typeof import('jspdf').default | null = null;
let jsPDFAutoTable: ((doc: import('jspdf').default, options: any) => void) | null = null;

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

export interface ExportOptions {
  format: 'csv' | 'json' | 'png' | 'svg' | 'excel' | 'pdf';
  filename?: string;
  includeMetadata?: boolean;
  resolution?: Resolution;
  chartTitle?: string;
  dataSource?: string;
  showTimestamp?: boolean;
}

export type Resolution = 'standard' | 'high' | 'ultra';
export type ExportRange = 'current' | 'all';

export interface ExportSettings {
  range: ExportRange;
  includeMetadata: boolean;
  includeWatermark: boolean;
  filenameTemplate: string;
  customFilename: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PDFExportOptions {
  filename: string;
  charts: Array<{
    chartRef: HTMLElement | null;
    data: ChartExportData[];
    title: string;
  }>;
  includeWatermark?: boolean;
  includeMetadata?: boolean;
  metadata?: ExportMetadata;
}

export interface BatchExportItem {
  chartRef: HTMLElement | null;
  data: ChartExportData[];
  name: string;
  title: string;
}

export interface ZIPExportOptions {
  filename: string;
  charts: BatchExportItem[];
  settings: {
    format: 'png' | 'svg' | 'pdf' | 'csv' | 'json';
    resolution: Resolution;
    includeMetadata: boolean;
  };
}

export const RESOLUTION_CONFIG: Record<Resolution, { scale: number; label: string; dpi: number }> = {
  standard: { scale: 2, label: '标准 (2x)', dpi: 144 },
  high: { scale: 4, label: '高清 (4x)', dpi: 288 },
  ultra: { scale: 6, label: '超清 (6x)', dpi: 432 },
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
    watermark?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const {
    backgroundColor = exportColors.background,
    padding = 20,
    resolution = 'standard',
    chartTitle,
    dataSource,
    showTimestamp = true,
    watermark = false,
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
  const watermarkHeight = watermark ? 30 : 0;

  const totalWidth = svgRect.width + padding * 2;
  const totalHeight = svgRect.height + padding * 2 + headerHeight + footerHeight + watermarkHeight;

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

        // 添加水印
        if (watermark) {
          ctx.save();
          ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
          ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText('Insight Analytics', 0, 0);
          ctx.restore();
        }

        onProgress?.({ status: 'exporting', progress: 80, message: '生成 PNG 文件...' });

        canvas.toBlob(
          (blob) => {
            if (blob) {
              URL.revokeObjectURL(svgUrl);
              onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });
              resolve(blob);
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
    watermark?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const {
    backgroundColor = exportColors.background,
    includeStyles = true,
    chartTitle,
    dataSource,
    showTimestamp = true,
    watermark = false,
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

  // 添加水印
  if (watermark) {
    const watermarkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    watermarkGroup.setAttribute('opacity', '0.1');
    watermarkGroup.setAttribute('transform', `rotate(-30, ${totalWidth / 2}, ${totalHeight / 2})`);

    const watermarkText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    watermarkText.setAttribute('x', String(totalWidth / 2));
    watermarkText.setAttribute('y', String(totalHeight / 2));
    watermarkText.setAttribute('text-anchor', 'middle');
    watermarkText.setAttribute('dominant-baseline', 'middle');
    watermarkText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    watermarkText.setAttribute('font-size', '24');
    watermarkText.setAttribute('font-weight', 'bold');
    watermarkText.setAttribute('fill', '#808080');
    watermarkText.textContent = 'Insight Analytics';
    watermarkGroup.appendChild(watermarkText);
    clone.appendChild(watermarkGroup);
  }

  onProgress?.({ status: 'exporting', progress: 60, message: '序列化 SVG...' });

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const svgData = new XMLSerializer().serializeToString(clone);

  onProgress?.({ status: 'exporting', progress: 80, message: '生成文件...' });

  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8;' });

  onProgress?.({ status: 'completed', progress: 100, message: '导出完成' });

  return blob;
}

export async function exportToPDF(
  options: PDFExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const {
    filename,
    charts,
    includeWatermark = true,
    includeMetadata = true,
    metadata,
  } = options;

  onProgress?.({ status: 'preparing', progress: 10, message: '准备 PDF 导出...' });

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
      message: `处理图表 ${i + 1}/${charts.length}: ${chart.title}...`,
    });

    // 添加标题
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(chart.title, margin, margin);

    // 添加图表图像
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
        const imgHeight = (imgWidth * 9) / 16; // 16:9 比例

        doc.addImage(imageData, 'PNG', margin, margin + 10, imgWidth, imgHeight);
      } catch (error) {
        logger.warn('Failed to add chart image to PDF', error as Error);
      }
    }

    // 添加数据表格
    if (chart.data.length > 0 && chart.data.length <= 50) {
      const tableStartY = margin + 100;
      const headers = Object.keys(chart.data[0]);
      const rows = chart.data.map((row) => headers.map((h) => String(row[h] || '')));

      const autoTable = await getJsPDFAutoTable();
      autoTable(doc, {
        head: [headers],
        body: rows.slice(0, 20), // 最多显示 20 行
        startY: tableStartY,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    // 添加页脚
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    const footerY = pageHeight - margin;
    doc.text(`页 ${i + 1} / ${charts.length}`, pageWidth / 2, footerY, { align: 'center' });

    if (includeMetadata && metadata) {
      const metadataText = `导出时间: ${new Date(metadata.exportedAt).toLocaleString('zh-CN')}`;
      doc.text(metadataText, margin, footerY);

      if (metadata.dataSource) {
        doc.text(`数据源: ${metadata.dataSource}`, margin, footerY - 5);
      }
    }

    // 添加水印
    if (includeWatermark) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.1 }));
      doc.setFontSize(40);
      doc.setTextColor(128, 128, 128);
      doc.text('Insight Analytics', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
      doc.restoreGraphicsState();
    }
  }

  onProgress?.({ status: 'exporting', progress: 90, message: '保存 PDF 文件...' });

  const sanitizedFilename = sanitizeFilename(filename);
  doc.save(`${sanitizedFilename}.pdf`);

  onProgress?.({ status: 'completed', progress: 100, message: 'PDF 导出完成' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportToZIP(
  options: ZIPExportOptions,
  onProgress?: ExportProgressCallback
): Promise<void> {
  const { filename, charts, settings } = options;

  onProgress?.({ status: 'preparing', progress: 10, message: '准备批量导出...' });

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const progress = 10 + Math.floor((i / charts.length) * 80);

    onProgress?.({
      status: 'exporting',
      progress,
      message: `导出图表 ${i + 1}/${charts.length}: ${chart.name}...`,
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

  onProgress?.({ status: 'exporting', progress: 95, message: '生成 ZIP 文件...' });

  const content = await zip.generateAsync({ type: 'blob' });
  const sanitizedFilename = sanitizeFilename(filename);
  downloadBlob(content, `${sanitizedFilename}.zip`);

  onProgress?.({ status: 'completed', progress: 100, message: '批量导出完成' });
}

function convertToCSV(data: ChartExportData[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
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

  return [headers.join(','), ...rows].join('\n');
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
    {
      format: 'pdf',
      label: 'PDF',
      description: 'PDF 文档格式，包含图表和摘要',
      requiresChartRef: true,
    },
  ];
}
