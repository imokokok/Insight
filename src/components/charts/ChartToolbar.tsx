'use client';

import { useState, useCallback } from 'react';

import {
  LineChart,
  AreaChart,
  CandlestickChart,
  Download,
  ChevronDown,
  Settings,
} from 'lucide-react';

import { baseColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

export type TimeRange = '1H' | '24H' | '7D' | '30D' | '1Y' | 'ALL';
export type ChartType = 'line' | 'area' | 'candle';

export interface ChartToolbarProps {
  timeRanges: TimeRange[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  chartTypes?: ChartType[];
  selectedType?: string;
  onTypeChange?: (type: string) => void;
  disabledChartTypes?: ChartType[];
  onExport?: () => void;
  className?: string;
}

const timeRangeLabels: Record<TimeRange, string> = {
  '1H': '1H',
  '24H': '24H',
  '7D': '7D',
  '30D': '30D',
  '1Y': '1Y',
  ALL: 'ALL',
};

const chartTypeConfig: Record<ChartType, { label: string; icon: typeof LineChart }> = {
  line: { label: 'Line', icon: LineChart },
  area: { label: 'Area', icon: AreaChart },
  candle: { label: 'Candle', icon: CandlestickChart },
};

export function ChartToolbar({
  timeRanges,
  selectedRange,
  onRangeChange,
  chartTypes,
  selectedType = 'line',
  onTypeChange,
  disabledChartTypes = [],
  onExport,
  className,
}: ChartToolbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleRangeChange = useCallback(
    (range: TimeRange) => {
      onRangeChange(range);
    },
    [onRangeChange]
  );

  const handleTypeChange = useCallback(
    (type: ChartType) => {
      onTypeChange?.(type);
    },
    [onTypeChange]
  );

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        'p-3 bg-white border border-gray-200 rounded-lg',
        className
      )}
    >
      {/* Time Range Selector - Desktop */}
      <div className="hidden sm:flex items-center gap-1 p-1 bg-gray-100 rounded-md">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              selectedRange === range
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            style={{
              backgroundColor: selectedRange === range ? baseColors.gray[50] : undefined,
              color: selectedRange === range ? baseColors.gray[900] : undefined,
            }}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
      </div>

      {/* Time Range Selector - Mobile Dropdown */}
      <div className="sm:hidden relative">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200"
        >
          {timeRangeLabels[selectedRange as TimeRange] || selectedRange}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[80px] bg-white border border-gray-200 rounded-md shadow-lg">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => {
                  handleRangeChange(range);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-xs font-medium text-left transition-all duration-200 first:rounded-t-md last:rounded-b-md',
                  selectedRange === range
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {timeRangeLabels[range]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-2">
        {/* Chart Type Switcher */}
        {chartTypes && chartTypes.length > 0 && onTypeChange && (
          <div className="hidden sm:flex items-center gap-1 p-1 bg-gray-100 rounded-md">
            {chartTypes.map((type) => {
              const config = chartTypeConfig[type];
              const Icon = config.icon;
              const isDisabled = disabledChartTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && handleTypeChange(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : selectedType === type
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  title={
                    isDisabled ? `${config.label} (Unavailable with multiple series)` : config.label
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{config.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chart Type Switcher - Mobile */}
        {chartTypes && chartTypes.length > 0 && onTypeChange && (
          <div className="sm:hidden flex items-center gap-1 p-1 bg-gray-100 rounded-md">
            {chartTypes.map((type) => {
              const config = chartTypeConfig[type];
              const Icon = config.icon;
              const isDisabled = disabledChartTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && handleTypeChange(type)}
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200',
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : selectedType === type
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  title={
                    isDisabled ? `${config.label} (Unavailable with multiple series)` : config.label
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}

        {/* Settings Button - Mobile Only */}
        <button
          className="sm:hidden flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Click outside handler for dropdowns */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMobileMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
