'use client';

import { RefObject } from 'react';
import html2canvas from 'html2canvas';
import { Download, ChevronDown, Table, FileJson, Image as ImageIcon } from 'lucide-react';
import { ChartType } from '../types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ExportSection');

interface ExportSectionProps {
  loading: boolean;
  locale: string;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  activeChart: ChartType;
  getChartTitle: () => string;
  exportToCSV: () => void;
  exportToJSON: () => void;
}

export default function ExportSection({
  loading,
  locale,
  chartContainerRef,
  activeChart,
  getChartTitle,
  exportToCSV,
  exportToJSON,
}: ExportSectionProps) {
  const exportChartToImage = async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const title = getChartTitle();
      const timestamp = new Date().toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');

      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      const padding = 20;
      const titleHeight = 40;
      const timestampHeight = 24;
      const extraHeight = titleHeight + timestampHeight + padding * 2;

      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height + extraHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.fillText(title, padding, padding + 24);

      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(
        locale === 'zh-CN' ? `导出时间: ${timestamp}` : `Exported: ${timestamp}`,
        padding,
        padding + titleHeight + 16
      );

      ctx.drawImage(canvas, 0, extraHeight);

      const link = document.createElement('a');
      const fileName = `market-overview-${activeChart}-${Date.now()}.png`;
      link.download = fileName;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      logger.error('导出图片失败', error instanceof Error ? error : new Error(String(error)));
      alert(
        locale === 'zh-CN' ? '导出图片失败，请重试' : 'Failed to export image, please try again'
      );
    }
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <Download className="w-4 h-4" />
        {locale === 'zh-CN' ? '导出' : 'Export'}
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
        <button
          onClick={exportToCSV}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg transition-colors border-b border-gray-100"
        >
          <Table className="w-4 h-4 text-gray-400" />
          CSV
        </button>
        <button
          onClick={exportToJSON}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
        >
          <FileJson className="w-4 h-4 text-gray-400" />
          JSON
        </button>
        <button
          onClick={exportChartToImage}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg transition-colors"
        >
          <ImageIcon className="w-4 h-4 text-gray-400" />
          {locale === 'zh-CN' ? '图片' : 'Image'}
        </button>
      </div>
    </div>
  );
}
