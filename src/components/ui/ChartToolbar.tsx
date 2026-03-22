'use client';

import { useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize,
  Minimize,
  Link2,
  Link2Off,
  LineChart,
  AreaChart,
  CandlestickChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
export type ChartType = 'line' | 'area' | 'candle';

export interface ChartToolbarProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  syncEnabled?: boolean;
  onSyncToggle?: (enabled: boolean) => void;
  showChartType?: boolean;
  showZoom?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showSync?: boolean;
  className?: string;
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1H', label: '1H' },
  { value: '24H', label: '24H' },
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'ALL' },
];

const chartTypes: { value: ChartType; label: string; icon: typeof LineChart }[] = [
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'area', label: 'Area', icon: AreaChart },
  { value: 'candle', label: 'Candle', icon: CandlestickChart },
];

export function ChartToolbar({
  timeRange,
  onTimeRangeChange,
  chartType = 'line',
  onChartTypeChange,
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  onFullscreen,
  isFullscreen = false,
  syncEnabled = false,
  onSyncToggle,
  showChartType = true,
  showZoom = true,
  showExport = true,
  showFullscreen = true,
  showSync = true,
  className,
}: ChartToolbarProps) {
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      onTimeRangeChange(range);
    },
    [onTimeRangeChange]
  );

  const handleChartTypeChange = useCallback(
    (type: ChartType) => {
      onChartTypeChange?.(type);
    },
    [onChartTypeChange]
  );

  const handleSyncToggle = useCallback(() => {
    onSyncToggle?.(!syncEnabled);
  }, [onSyncToggle, syncEnabled]);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        'p-3 bg-white border border-gray-200 rounded-lg',
        className
      )}
    >
      {/* Time Range Selector */}
      <div className="flex items-center gap-1">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              timeRange === range.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-2">
        {/* Chart Type Switcher */}
        {showChartType && onChartTypeChange && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
            {chartTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => handleChartTypeChange(type.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                    chartType === type.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  title={type.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Zoom Controls */}
        {showZoom && (onZoomIn || onZoomOut || onResetZoom) && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="px-2 text-xs font-medium text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            )}
            {onResetZoom && (
              <button
                onClick={onResetZoom}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-200"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Export Button */}
        {showExport && onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200"
            title="Export Data"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Fullscreen Toggle */}
        {showFullscreen && onFullscreen && (
          <button
            onClick={onFullscreen}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              isFullscreen
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        )}

        {/* Chart Sync Toggle */}
        {showSync && onSyncToggle && (
          <button
            onClick={handleSyncToggle}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              syncEnabled
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            title={syncEnabled ? 'Disable Sync' : 'Enable Sync'}
          >
            {syncEnabled ? (
              <>
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sync On</span>
              </>
            ) : (
              <>
                <Link2Off className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sync Off</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ChartToolbar;
