/* eslint-disable max-lines-per-function */
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';

import { ChartToolbar, type TimeRange } from '@/components/charts/ChartToolbar';
import { useTranslations } from '@/i18n';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { type Blockchain } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { downloadBlob } from '@/lib/utils/download';

import { type ChartDataPoint } from '../constants';
import { chainNames, chainColors } from '../utils';

interface CursorPoint {
  x: number;
  y: number;
}

interface CrosshairCursorProps {
  points: CursorPoint[];
  height: number;
}

const CrosshairCursor = ({ points, height }: CrosshairCursorProps) => {
  if (!points?.length) return null;
  const { x, y } = points[0];
  return (
    <g>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={chartColors.recharts.axis}
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={y}
        x2={x}
        y2={y}
        stroke={chartColors.recharts.axis}
        strokeDasharray="3 3"
        strokeWidth={1}
      />
    </g>
  );
};

interface ReferenceLineConfig {
  id: string;
  y: number;
  label: string;
  color: string;
  strokeDasharray?: string;
}

interface InteractivePriceChartProps {
  chartData: ChartDataPoint[];
  chartDataWithMA: ChartDataPoint[];
  filteredChains: Blockchain[];
  hiddenLines: string[];
  scatterData: Array<
    Partial<ChartDataPoint> & {
      outlierChain: Blockchain;
      outlierPrice: number;
      deviation: number;
      timestamp: number;
    }
  >;
  avgPrice: number;
  medianPrice: number;
  onLegendClick: (e: { dataKey: string; color: string; type: string; value: string }) => void;
  onLegendDoubleClick: (chain: Blockchain) => void;
}

interface ViewState {
  startIndex: number;
  endIndex: number;
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number; color?: string }>;
  label?: string;
  filteredChains: Blockchain[];
}

function CustomTooltip({ active, payload, label, filteredChains }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const priceData = payload.filter(
    (p) =>
      p.dataKey &&
      !String(p.dataKey).includes('_MA') &&
      isBlockchain(p.dataKey) &&
      filteredChains.includes(p.dataKey)
  );

  return (
    <div
      className="border p-3 rounded-lg shadow-lg min-w-[240px]"
      style={{
        backgroundColor: chartColors.recharts.white,
        borderColor: chartColors.recharts.border,
      }}
    >
      <p
        className="text-xs mb-2 font-medium border-b pb-2"
        style={{ color: chartColors.recharts.tick, borderColor: chartColors.recharts.border }}
      >
        {label}
      </p>
      {priceData.map((entry) => {
        const dataKey = entry.dataKey;
        const chainName = isBlockchain(dataKey) ? chainNames[dataKey] : String(dataKey);
        return (
          <div
            key={String(entry.dataKey)}
            className="mb-1.5 pb-1.5 border-b last:border-0 last:mb-0 last:pb-0"
            style={{ borderColor: chartColors.recharts.border }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span
                className="text-sm font-medium"
                style={{ color: chartColors.recharts.tickDark }}
              >
                {chainName}
              </span>
            </div>
            <div
              className="text-sm pl-4.5 font-mono"
              style={{ color: chartColors.recharts.tickDark }}
            >
              ${Number(entry.value).toFixed(4)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InteractivePriceChart({
  chartData,
  chartDataWithMA,
  filteredChains,
  hiddenLines,
  scatterData,
  avgPrice,
  medianPrice,
  onLegendClick,
}: InteractivePriceChartProps) {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>(() => ({
    startIndex: 0,
    endIndex: Math.max(0, chartData.length - 1),
  }));
  const [referenceLines, setReferenceLines] = useState<ReferenceLineConfig[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [showSelectionBox, setShowSelectionBox] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24H');

  const handleTimeRangeChange = useCallback((range: string) => {
    setSelectedTimeRange(range as TimeRange);
  }, []);

  const getTimeRangeInMs = useCallback((range: TimeRange): number => {
    const now = Date.now();
    switch (range) {
      case '1H':
        return now - 60 * 60 * 1000;
      case '24H':
        return now - 24 * 60 * 60 * 1000;
      case '7D':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30D':
        return now - 30 * 24 * 60 * 60 * 1000;
      default:
        return now - 24 * 60 * 60 * 1000;
    }
  }, []);

  const timeFilteredData = useMemo(() => {
    if (chartDataWithMA.length === 0) return [];
    const cutoffTime = getTimeRangeInMs(selectedTimeRange);
    return chartDataWithMA.filter((point) => point.timestamp >= cutoffTime);
  }, [chartDataWithMA, selectedTimeRange, getTimeRangeInMs]);

  const prevDataLengthRef = useRef(chartData.length);
  useEffect(() => {
    if (chartData.length !== prevDataLengthRef.current) {
      prevDataLengthRef.current = chartData.length;
      if (chartData.length > 0) {
        queueMicrotask(() => {
          setViewState({
            startIndex: 0,
            endIndex: chartData.length - 1,
          });
        });
      }
    }
  }, [chartData.length]);

  useEffect(() => {
    if (timeFilteredData.length > 0) {
      queueMicrotask(() => {
        setViewState({
          startIndex: 0,
          endIndex: timeFilteredData.length - 1,
        });
      });
    }
  }, [selectedTimeRange, timeFilteredData.length]);

  const visibleData = useMemo(() => {
    if (timeFilteredData.length === 0) return [];
    return timeFilteredData.slice(viewState.startIndex, viewState.endIndex + 1);
  }, [timeFilteredData, viewState]);

  // Export price chart data to CSV
  const handleExport = useCallback(() => {
    if (visibleData.length === 0 || filteredChains.length === 0) {
      return;
    }

    try {
      const cutoffTime = getTimeRangeInMs(selectedTimeRange);
      const startTime = new Date(cutoffTime).toISOString();
      const endTime = new Date().toISOString();

      const csvLines: string[] = [];

      csvLines.push('=== Price Chart Data ===');
      csvLines.push(`Export Timestamp,${new Date().toISOString()}`);
      csvLines.push(`Time Range,${selectedTimeRange}`);
      csvLines.push(`Data Start Time,${startTime}`);
      csvLines.push(`Data End Time,${endTime}`);
      csvLines.push(`Visible Data Points,${visibleData.length}`);
      csvLines.push(
        `View Range,${viewState.startIndex + 1}-${viewState.endIndex + 1} of ${chartData.length}`
      );
      csvLines.push('');

      const headers = ['Timestamp', 'Time', ...filteredChains.map((chain) => chainNames[chain])];
      csvLines.push(headers.join(','));

      visibleData.forEach((point) => {
        const row: string[] = [String(point.timestamp || ''), String(point.time || '')];
        filteredChains.forEach((chain) => {
          const price = point[chain] as number | undefined;
          row.push(price !== undefined && !isNaN(price) ? price.toFixed(6) : '');
        });
        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(
        blob,
        `price-chart-${selectedTimeRange}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );
    } catch (error) {
      console.error('Failed to export price chart data:', error);
    }
  }, [
    visibleData,
    filteredChains,
    selectedTimeRange,
    viewState,
    chartData.length,
    getTimeRangeInMs,
  ]);

  // Calculate price domain for Y axis
  const priceDomain = useMemo(() => {
    if (visibleData.length === 0) return ['auto', 'auto'] as [string, string];

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    visibleData.forEach((point) => {
      filteredChains.forEach((chain) => {
        const price = point[chain] as number | undefined;
        if (price !== undefined && !isNaN(price)) {
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      });
    });

    const padding = (maxPrice - minPrice) * 0.1;
    return [minPrice - padding, maxPrice + padding] as [number, number];
  }, [visibleData, filteredChains]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewState((prev) => {
      const totalPoints = timeFilteredData.length;
      const currentRange = prev.endIndex - prev.startIndex;
      const newRange = Math.max(10, Math.floor(currentRange * 0.7));
      const center = Math.floor((prev.startIndex + prev.endIndex) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(totalPoints - 1, newStart + newRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [timeFilteredData.length]);

  const handleZoomOut = useCallback(() => {
    setViewState((prev) => {
      const totalPoints = timeFilteredData.length;
      const currentRange = prev.endIndex - prev.startIndex;
      const newRange = Math.min(totalPoints - 1, Math.floor(currentRange * 1.4));
      const center = Math.floor((prev.startIndex + prev.endIndex) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(totalPoints - 1, newStart + newRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [timeFilteredData.length]);

  const handleResetZoom = useCallback(() => {
    setViewState({
      startIndex: 0,
      endIndex: Math.max(0, timeFilteredData.length - 1),
    });
  }, [timeFilteredData.length]);

  // Pan controls
  const handlePanLeft = useCallback(() => {
    setViewState((prev) => {
      const currentRange = prev.endIndex - prev.startIndex;
      const shift = Math.max(1, Math.floor(currentRange * 0.2));
      const newStart = Math.max(0, prev.startIndex - shift);
      const newEnd = Math.min(timeFilteredData.length - 1, newStart + currentRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [timeFilteredData.length]);

  const handlePanRight = useCallback(() => {
    setViewState((prev) => {
      const currentRange = prev.endIndex - prev.startIndex;
      const shift = Math.max(1, Math.floor(currentRange * 0.2));
      const newEnd = Math.min(timeFilteredData.length - 1, prev.endIndex + shift);
      const newStart = Math.max(0, newEnd - currentRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [timeFilteredData.length]);

  // Box selection for zoom
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setIsSelecting(true);
        setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setShowSelectionBox(true);
      }
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isSelecting && selectionStart) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }
    },
    [isSelecting, selectionStart]
  );

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      const chartWidth = containerRef.current?.clientWidth || 1;
      const selectionWidth = Math.abs(selectionEnd.x - selectionStart.x);
      const selectionHeight = Math.abs(selectionEnd.y - selectionStart.y);

      if (selectionWidth > 30 && selectionHeight > 30) {
        const leftPercent = Math.min(selectionStart.x, selectionEnd.x) / chartWidth;
        const rightPercent = Math.max(selectionStart.x, selectionEnd.x) / chartWidth;
        const currentRange = viewState.endIndex - viewState.startIndex;
        const newStart = Math.floor(viewState.startIndex + leftPercent * currentRange);
        const newEnd = Math.ceil(viewState.startIndex + rightPercent * currentRange);

        if (newEnd > newStart + 5) {
          setViewState({
            startIndex: Math.max(0, newStart),
            endIndex: Math.min(chartData.length - 1, newEnd),
          });
        }
      }
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setShowSelectionBox(false);
  }, [isSelecting, selectionStart, selectionEnd, viewState, chartData.length]);

  // Reference line functions
  const addReferenceLine = useCallback(
    (type: 'current' | 'avg' | 'median' | 'custom') => {
      const id = `ref-${Date.now()}`;
      let y = 0;
      let label = '';
      let color = '';

      switch (type) {
        case 'current':
          if (visibleData.length > 0) {
            const lastPoint = visibleData[visibleData.length - 1];
            const prices = filteredChains
              .map((chain) => lastPoint[chain] as number | undefined)
              .filter((p): p is number => p !== undefined && !isNaN(p));
            y = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
          }
          label = t('crossChain.currentPrice');
          color = chartColors.recharts.primary;
          break;
        case 'avg':
          y = avgPrice;
          label = t('crossChain.averagePrice');
          color = semanticColors.success.main;
          break;
        case 'median':
          y = medianPrice;
          label = t('crossChain.medianPrice');
          color = semanticColors.warning.main;
          break;
        case 'custom':
          y =
            priceDomain[0] === 'auto'
              ? 0
              : (priceDomain[0] as number) +
                ((priceDomain[1] as number) - (priceDomain[0] as number)) / 2;
          label = t('crossChain.customLine');
          color = semanticColors.info.main;
          break;
      }

      if (y > 0) {
        setReferenceLines((prev) => [...prev, { id, y, label, color, strokeDasharray: '5 5' }]);
      }
    },
    [visibleData, filteredChains, avgPrice, medianPrice, priceDomain, t]
  );

  const removeReferenceLine = useCallback((id: string) => {
    setReferenceLines((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const clearAllReferenceLines = useCallback(() => {
    setReferenceLines([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            handlePanLeft();
            break;
          case 'ArrowRight':
            e.preventDefault();
            handlePanRight();
            break;
          case '0':
            e.preventDefault();
            handleResetZoom();
            break;
        }
      }

      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            handlePanLeft();
            break;
          case 'ArrowRight':
            handlePanRight();
            break;
          case 'Home':
            handleResetZoom();
            break;
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleZoomIn, handleZoomOut, handlePanLeft, handlePanRight, handleResetZoom]);

  // Selection box style
  const selectionBoxStyle = useMemo(() => {
    if (!selectionStart || !selectionEnd || !showSelectionBox) return { display: 'none' };

    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    return {
      left,
      top,
      width,
      height,
      display: 'block',
    };
  }, [selectionStart, selectionEnd, showSelectionBox]);

  // Tooltip content renderer
  const renderTooltip = useCallback(
    (props: unknown) => {
      const tooltipProps = props as {
        active?: boolean;
        payload?: ReadonlyArray<{ dataKey?: string | number; value?: number; color?: string }>;
        label?: string;
      };
      return <CustomTooltip {...tooltipProps} filteredChains={filteredChains} />;
    },
    [filteredChains]
  );

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      {/* Chart Toolbar */}
      <ChartToolbar
        timeRanges={['1H', '24H', '7D', '30D']}
        selectedRange={selectedTimeRange}
        onRangeChange={handleTimeRangeChange}
        onExport={handleExport}
        className="mb-3"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {t('crossChain.priceChart')}
        </h3>

        {/* Control Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
            <button
              onClick={handleZoomIn}
              className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
              title={t('crossChain.zoomIn')}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
              title={t('crossChain.zoomOut')}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
              title={t('crossChain.resetZoom')}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Pan Controls */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
            <button
              onClick={handlePanLeft}
              className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
              title={t('crossChain.panLeft')}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={handlePanRight}
              className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
              title={t('crossChain.panRight')}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Reference Line Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => addReferenceLine('current')}
              className="px-2 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition-all duration-200"
            >
              {t('crossChain.currentPrice')}
            </button>
            <button
              onClick={() => addReferenceLine('avg')}
              className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded transition-all duration-200"
            >
              {t('crossChain.averagePrice')}
            </button>
            <button
              onClick={() => addReferenceLine('median')}
              className="px-2 py-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded transition-all duration-200"
            >
              {t('crossChain.medianPrice')}
            </button>
            {referenceLines.length > 0 && (
              <button
                onClick={clearAllReferenceLines}
                className="px-2 py-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded transition-all duration-200"
              >
                {t('crossChain.clearAll')}
              </button>
            )}
          </div>

          {/* View Range Info */}
          <div className="text-xs text-gray-500 px-2">
            {viewState.startIndex + 1} - {viewState.endIndex + 1} / {chartData.length}
          </div>
        </div>
      </div>

      {/* Reference Lines List */}
      {referenceLines.length > 0 && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-gray-500">{t('crossChain.referenceLines')}:</span>
          {referenceLines.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
            >
              <span className="w-2 h-0.5 rounded-full" style={{ backgroundColor: line.color }} />
              <span className="text-gray-600">{line.label}:</span>
              <span className="font-mono text-gray-800">${line.y.toFixed(4)}</span>
              <button
                onClick={() => removeReferenceLine(line.id)}
                className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="h-80 relative select-none bg-white border border-gray-200 rounded-lg p-2"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="img"
        aria-label={t('crossChain.priceChart')}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            handlePanLeft();
          } else if (e.key === 'ArrowRight') {
            handlePanRight();
          } else if (e.key === '+' || e.key === '=') {
            handleZoomIn();
          } else if (e.key === '-') {
            handleZoomOut();
          } else if (e.key === 'Home') {
            handleResetZoom();
          }
        }}
      >
        <div className="sr-only">
          {t('crossChain.priceChart')} - {t('crossChain.shortcuts')}: Arrow keys to pan, +/- to
          zoom, Home to reset
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              tick={{ fill: chartColors.recharts.tick, fontSize: 11 }}
            />
            <YAxis
              domain={priceDomain}
              tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
              width={70}
              stroke={chartColors.recharts.axis}
              tick={{ fill: chartColors.recharts.tick, fontSize: 11 }}
            />
            <RechartsTooltip
              content={renderTooltip}
              cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
            />
            <Legend
              onClick={(data: unknown) => {
                const legendData = data as {
                  dataKey: string;
                  color: string;
                  type: string;
                  value: string;
                };
                onLegendClick(legendData);
              }}
            />

            {filteredChains.map((chain) => (
              <Line
                key={chain}
                type="monotone"
                dataKey={chain}
                name={chainNames[chain]}
                stroke={chainColors[chain]}
                strokeWidth={2}
                dot={false}
                hide={hiddenLines.includes(chain)}
              />
            ))}

            {scatterData.length > 0 && (
              <Scatter
                data={scatterData.filter((d) => {
                  const index = chartData.findIndex((cd) => cd.timestamp === d.timestamp);
                  return index >= viewState.startIndex && index <= viewState.endIndex;
                })}
                fill={semanticColors.warning.dark}
                name={t('crossChain.anomalyPoint')}
              />
            )}

            {/* Reference Lines */}
            {referenceLines.map((line) => (
              <ReferenceLine
                key={line.id}
                y={line.y}
                stroke={line.color}
                strokeDasharray={line.strokeDasharray}
                label={{
                  value: `${line.label}: $${line.y.toFixed(2)}`,
                  fill: line.color,
                  fontSize: 11,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Selection Box Overlay */}
        {showSelectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded"
            style={selectionBoxStyle}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 text-xs text-gray-400 flex items-center gap-4 flex-wrap">
        <span>{t('crossChain.shortcuts')}:</span>
        <span>
          Ctrl + {t('crossChain.scroll')}: {t('crossChain.zoom')}
        </span>
        <span>← →: {t('crossChain.pan')}</span>
        <span>Home: {t('crossChain.reset')}</span>
        <span>
          {t('crossChain.dragSelect')}: {t('crossChain.zoomToArea')}
        </span>
      </div>
    </div>
  );
}

export default InteractivePriceChart;
