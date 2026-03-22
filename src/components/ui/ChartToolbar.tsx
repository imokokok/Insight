'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart,
  CandlestickChart,
  AreaChart,
  Download,
  RotateCcw,
  Plus,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimeRange {
  key: string;
  label: string;
  labelZh?: string;
}

export interface ChartType {
  key: string;
  label: string;
  icon?: ReactNode;
}

export interface ChartToolbarProps {
  timeRanges: TimeRange[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  chartTypes?: ChartType[];
  selectedType?: string;
  onTypeChange?: (type: string) => void;
  indicators?: string[];
  onAddIndicator?: (indicator: string) => void;
  onExport?: () => void;
  onResetZoom?: () => void;
  showZoomReset?: boolean;
  className?: string;
}

export function ChartToolbar({
  timeRanges,
  selectedRange,
  onRangeChange,
  chartTypes,
  selectedType,
  onTypeChange,
  indicators,
  onAddIndicator,
  onExport,
  onResetZoom,
  showZoomReset = false,
  className,
}: ChartToolbarProps) {
  const t = useTranslations('chartToolbar');

  const defaultChartTypes: ChartType[] = [
    {
      key: 'line',
      label: t('chartType.line'),
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      key: 'area',
      label: t('chartType.area'),
      icon: <AreaChart className="w-4 h-4" />,
    },
    {
      key: 'candle',
      label: t('chartType.candle'),
      icon: <CandlestickChart className="w-4 h-4" />,
    },
  ];

  const chartTypeList = chartTypes || defaultChartTypes;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200',
        className
      )}
    >
      {/* Time Range Selector */}
      <div className="flex items-center gap-1">
        {timeRanges.map((range) => (
          <button
            key={range.key}
            onClick={() => onRangeChange(range.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              'min-h-[32px] min-w-[44px]',
              selectedRange === range.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            aria-pressed={selectedRange === range.key}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Chart Type Switcher */}
      {chartTypeList.length > 0 && onTypeChange && (
        <div className="flex items-center gap-1">
          {chartTypeList.map((type) => (
            <button
              key={type.key}
              onClick={() => onTypeChange(type.key)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5',
                'text-xs font-medium rounded-md transition-all duration-200',
                'min-h-[32px] min-w-[32px]',
                selectedType === type.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              aria-pressed={selectedType === type.key}
              title={type.label}
            >
              {type.icon}
              <span className="hidden sm:inline">{type.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {chartTypeList.length > 0 && onTypeChange && (
        <div className="w-px h-5 bg-gray-300 mx-1" />
      )}

      {/* Technical Indicator Button */}
      {indicators && indicators.length > 0 && onAddIndicator && (
        <div className="relative group">
          <button
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5',
              'text-xs font-medium rounded-md transition-all duration-200',
              'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              'min-h-[32px]'
            )}
            title={t('indicators')}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">{t('indicators')}</span>
            <Plus className="w-3 h-3" />
          </button>
          <div className="absolute top-full left-0 mt-1 py-1 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[140px]">
            {indicators.map((indicator) => (
              <button
                key={indicator}
                onClick={() => onAddIndicator(indicator)}
                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {indicator}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Reset Zoom Button */}
        {showZoomReset && onResetZoom && (
          <button
            onClick={onResetZoom}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5',
              'text-xs font-medium rounded-md transition-all duration-200',
              'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              'min-h-[32px]'
            )}
            title={t('resetZoom')}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">{t('resetZoom')}</span>
          </button>
        )}

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5',
              'text-xs font-medium rounded-md transition-all duration-200',
              'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              'min-h-[32px]'
            )}
            title={t('export')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('export')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ChartToolbar;
