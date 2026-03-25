'use client';

import { RefObject } from 'react';
import html2canvas from 'html2canvas';
import { Download, ChevronDown, Table, FileJson, Image as ImageIcon } from 'lucide-react';
import { ChartType } from '../types';
import { createLogger } from '@/lib/utils/logger';
import { useTranslations, useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { exportColors } from '@/lib/config/colors';

const logger = createLogger('ExportSection');

interface ExportSectionProps {
  loading: boolean;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  activeChart: ChartType;
  getChartTitle: () => string;
  exportToCSV: () => void;
  exportToJSON: () => void;
}

export default function ExportSection({
  loading,
  chartContainerRef,
  activeChart,
  getChartTitle,
  exportToCSV,
  exportToJSON,
}: ExportSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const exportChartToImage = async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: exportColors.background,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const title = getChartTitle();
      const timestamp = new Date().toLocaleString(isChineseLocale(locale) ? 'zh-CN' : 'en-US');

      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      const padding = 20;
      const titleHeight = 40;
      const timestampHeight = 24;
      const extraHeight = titleHeight + timestampHeight + padding * 2;

      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height + extraHeight;

      ctx.fillStyle = exportColors.background;
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = exportColors.text.primary;
      ctx.textAlign = 'left';
      ctx.fillText(title, padding, padding + 24);

      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = exportColors.text.secondary;
      ctx.fillText(
        `${t('marketOverview.export.exportTime')}: ${timestamp}`,
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
      alert(t('marketOverview.export.exportFailed'));
    }
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
        <Download className="w-4 h-4" />
        {t('marketOverview.export.title')}
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
        <button
          onClick={exportToCSV}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
        >
          <Table className="w-4 h-4 text-gray-400" />
          {t('marketOverview.export.csv')}
        </button>
        <button
          onClick={exportToJSON}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
        >
          <FileJson className="w-4 h-4 text-gray-400" />
          {t('marketOverview.export.json')}
        </button>
        <button
          onClick={exportChartToImage}
          disabled={loading}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ImageIcon className="w-4 h-4 text-gray-400" />
          {t('marketOverview.export.image')}
        </button>
      </div>
    </div>
  );
}
