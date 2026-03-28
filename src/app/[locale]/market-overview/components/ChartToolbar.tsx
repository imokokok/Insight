'use client';

import { TrendingUp, ActivitySquare, RefreshCw } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import { type ChartType } from '../types';

const CHARTS_WITH_TYPE_SUPPORT: ChartType[] = ['trend', 'comparison', 'benchmark'];

interface ChartToolbarProps {
  activeChart: ChartType;
  chartType: 'line' | 'area' | 'candle';
  onChartTypeChange: (type: 'line' | 'area' | 'candle') => void;
  zoomRange: { startIndex?: number; endIndex?: number } | null;
  onResetZoom: () => void;
  onExport: () => void;
}

export default function ChartToolbar({
  activeChart,
  chartType,
  onChartTypeChange,
  zoomRange,
  onResetZoom,
  onExport,
}: ChartToolbarProps) {
  const t = useTranslations('marketOverview');

  if (!CHARTS_WITH_TYPE_SUPPORT.includes(activeChart)) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 p-2">
      <div className="flex items-center gap-1">
        {(['line', 'area'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onChartTypeChange(type)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200',
              chartType === type
                ? 'text-primary-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            )}
            title={type === 'line' ? t('chartTypes.line') : t('chartTypes.area')}
          >
            {type === 'line' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <ActivitySquare className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {type === 'line' ? t('chartTypes.line') : t('chartTypes.area')}
            </span>
          </button>
        ))}
      </div>

      {zoomRange && (
        <button
          onClick={onResetZoom}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('ui.chart.reset')}</span>
        </button>
      )}

      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-all duration-200"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('ui.chart.export')}</span>
      </button>
    </div>
  );
}

export { CHARTS_WITH_TYPE_SUPPORT };
