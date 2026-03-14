/**
 * 图表导出功能 Hook
 */

import { useCallback, useRef } from 'react';
import { exportColors } from '@/lib/config/colors';

export interface ExportOptions {
  filename?: string;
  format: 'png' | 'svg' | 'csv' | 'json';
  quality?: number;
  backgroundColor?: string;
}

export interface ChartData {
  time: string | number;
  [key: string]: number | string | undefined;
}

export function useChartExport() {
  const chartRef = useRef<HTMLDivElement>(null);

  // 导出为 PNG
  const exportToPNG = useCallback(async (
    element: HTMLElement | null,
    options: Omit<ExportOptions, 'format'> = {}
  ): Promise<void> => {
    const { 
      filename = 'chart-export', 
      quality = 1,
      backgroundColor = exportColors.background 
    } = options;

    if (!element) {
      console.error('Export element not found');
      return;
    }

    try {
      // 使用 html2canvas 或类似库
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        backgroundColor,
        scale: quality * 2, // 高DPI
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png', quality);
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  }, []);

  // 导出为 SVG
  const exportToSVG = useCallback((
    svgElement: SVGSVGElement | null,
    options: Omit<ExportOptions, 'format'> = {}
  ): void => {
    const { filename = 'chart-export' } = options;

    if (!svgElement) {
      console.error('SVG element not found');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SVG:', error);
    }
  }, []);

  // 导出为 CSV
  const exportToCSV = useCallback(<T extends ChartData>(
    data: T[],
    options: Omit<ExportOptions, 'format'> = {}
  ): void => {
    const { filename = 'chart-data' } = options;

    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // 处理包含逗号或引号的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  }, []);

  // 导出为 JSON
  const exportToJSON = useCallback(<T extends ChartData>(
    data: T[],
    options: Omit<ExportOptions, 'format'> = {}
  ): void => {
    const { filename = 'chart-data' } = options;

    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export JSON:', error);
    }
  }, []);

  // 统一导出接口
  const exportChart = useCallback(<T extends ChartData>(
    options: ExportOptions,
    data?: T[],
    element?: HTMLElement | SVGSVGElement | null
  ): void => {
    const { format } = options;

    switch (format) {
      case 'png':
        exportToPNG(element as HTMLElement, options);
        break;
      case 'svg':
        exportToSVG(element as SVGSVGElement, options);
        break;
      case 'csv':
        if (data) exportToCSV(data, options);
        break;
      case 'json':
        if (data) exportToJSON(data, options);
        break;
      default:
        console.error('Unsupported export format:', format);
    }
  }, [exportToPNG, exportToSVG, exportToCSV, exportToJSON]);

  return {
    chartRef,
    exportToPNG,
    exportToSVG,
    exportToCSV,
    exportToJSON,
    exportChart,
  };
}
