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

import { cn } from '@/lib/utils';

type TimeRange = '1H' | '24H' | '7D' | '30D' | '1Y' | 'ALL';
type ChartType = 'line' | 'area' | 'candle';

interface ChartToolbarProps {
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
        'flex flex-wrap items-center justify-between gap-3 border-y border-slate-900/15 bg-white/45 px-3 py-2',
        className
      )}
    >
      {/* Time Range Selector - Desktop */}
      <div className="hidden items-center border border-slate-900/15 sm:flex">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            className={cn(
              'border-r border-slate-900/15 px-3 py-1.5 font-mono text-xs font-medium transition-colors last:border-r-0',
              selectedRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-950'
            )}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
      </div>

      {/* Time Range Selector - Mobile Dropdown */}
      <div className="sm:hidden relative">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 border border-slate-900/15 bg-white px-3 py-1.5 font-mono text-xs font-medium text-slate-700 transition-colors hover:border-blue-600"
        >
          {timeRangeLabels[selectedRange as TimeRange] || selectedRange}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {isMobileMenuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[96px] border border-slate-900/20 bg-[#f8f7f4]">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => {
                  handleRangeChange(range);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full border-b border-slate-900/10 px-3 py-2 text-left font-mono text-xs font-medium transition-colors last:border-b-0',
                  selectedRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-white'
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
          <div className="hidden items-center border border-slate-900/15 sm:flex">
            {chartTypes.map((type) => {
              const config = chartTypeConfig[type];
              const Icon = config.icon;
              const isDisabled = disabledChartTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && handleTypeChange(type)}
                  className={cn(
                    'flex items-center gap-1.5 border-r border-slate-900/15 px-2.5 py-1.5 text-xs font-medium transition-colors last:border-r-0',
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
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
          <div className="flex items-center border border-slate-900/15 sm:hidden">
            {chartTypes.map((type) => {
              const config = chartTypeConfig[type];
              const Icon = config.icon;
              const isDisabled = disabledChartTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && handleTypeChange(type)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center border-r border-slate-900/15 transition-colors last:border-r-0',
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
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
              'flex items-center gap-1.5 border border-slate-900/15 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700'
            )}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}

        {/* Settings Button - Mobile Only */}
        <button
          className="flex h-8 w-8 items-center justify-center border border-slate-900/15 bg-white text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700 sm:hidden"
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
