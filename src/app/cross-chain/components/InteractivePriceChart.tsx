'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';
import { Blockchain } from '@/lib/oracles';
import { chainNames, chainColors } from '../utils';
import { ChartDataPoint } from '../constants';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors } from '@/lib/config/colors';

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
  hiddenLines: Set<string>;
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
  onLegendClick: (e: any) => void;
  onLegendDoubleClick: (chain: Blockchain) => void;
}

interface ViewState {
  startIndex: number;
  endIndex: number;
}

// Custom tooltip component - defined outside main component to avoid re-creation
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
      filteredChains.includes(p.dataKey as Blockchain)
  );

  return (
    <div className="bg-white border border-gray-200 p-4 min-w-[280px]">
      <p className="text-gray-600 text-xs mb-3 font-medium border-b border-gray-100 pb-2">
        {label}
      </p>
      {priceData.map((entry, index: number) => (
        <div className="mb-2 pb-2 border-b border-gray-100 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-medium text-gray-900">
              {chainNames[entry.dataKey as Blockchain]}
            </span>
          </div>
          <div className="text-sm text-gray-700 pl-5 font-mono">
            ${Number(entry.value).toFixed(4)}
          </div>
        </div>
      ))}
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
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>(() => ({
    startIndex: 0,
    endIndex: Math.max(0, chartData.length - 1),
  }));
  const [referenceLines, setReferenceLines] = useState<ReferenceLineConfig[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingRefLine, setIsDraggingRefLine] = useState<string | null>(null);
  const [showSelectionBox, setShowSelectionBox] = useState(false);

  // Update view state when data changes - using a microtask to avoid synchronous setState
  const prevDataLengthRef = useRef(chartData.length);
  useEffect(() => {
    if (chartData.length !== prevDataLengthRef.current) {
      prevDataLengthRef.current = chartData.length;
      if (chartData.length > 0) {
        // Use queueMicrotask to defer the state update
        queueMicrotask(() => {
          setViewState({
            startIndex: 0,
            endIndex: chartData.length - 1,
          });
        });
      }
    }
  }, [chartData.length]);

  // Get visible data based on view state
  const visibleData = useMemo(() => {
    if (chartDataWithMA.length === 0) return [];
    return chartDataWithMA.slice(viewState.startIndex, viewState.endIndex + 1);
  }, [chartDataWithMA, viewState]);

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

    // Add some padding
    const padding = (maxPrice - minPrice) * 0.1;
    return [minPrice - padding, maxPrice + padding] as [number, number];
  }, [visibleData, filteredChains]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewState((prev) => {
      const totalPoints = chartData.length;
      const currentRange = prev.endIndex - prev.startIndex;
      const newRange = Math.max(10, Math.floor(currentRange * 0.7));
      const center = Math.floor((prev.startIndex + prev.endIndex) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(totalPoints - 1, newStart + newRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [chartData.length]);

  const handleZoomOut = useCallback(() => {
    setViewState((prev) => {
      const totalPoints = chartData.length;
      const currentRange = prev.endIndex - prev.startIndex;
      const newRange = Math.min(totalPoints - 1, Math.floor(currentRange * 1.4));
      const center = Math.floor((prev.startIndex + prev.endIndex) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(totalPoints - 1, newStart + newRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [chartData.length]);

  const handleResetZoom = useCallback(() => {
    setViewState({
      startIndex: 0,
      endIndex: Math.max(0, chartData.length - 1),
    });
  }, [chartData.length]);

  // Pan controls
  const handlePanLeft = useCallback(() => {
    setViewState((prev) => {
      const currentRange = prev.endIndex - prev.startIndex;
      const shift = Math.max(1, Math.floor(currentRange * 0.2));
      const newStart = Math.max(0, prev.startIndex - shift);
      const newEnd = Math.min(chartData.length - 1, newStart + currentRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [chartData.length]);

  const handlePanRight = useCallback(() => {
    setViewState((prev) => {
      const currentRange = prev.endIndex - prev.startIndex;
      const shift = Math.max(1, Math.floor(currentRange * 0.2));
      const newEnd = Math.min(chartData.length - 1, prev.endIndex + shift);
      const newStart = Math.max(0, newEnd - currentRange);
      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [chartData.length]);

  // Box selection for zoom
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && !isDraggingRefLine) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setIsSelecting(true);
          setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setShowSelectionBox(true);
        }
      }
    },
    [isDraggingRefLine]
  );

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
      // Calculate selection as percentage of chart width
      const chartWidth = containerRef.current?.clientWidth || 1;

      const selectionWidth = Math.abs(selectionEnd.x - selectionStart.x);
      const selectionHeight = Math.abs(selectionEnd.y - selectionStart.y);

      // Only zoom if selection is significant
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
    setIsDraggingRefLine(null);
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
      // Ctrl + Arrow keys for panning
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

      // Arrow keys without Ctrl for panning
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
    (props: any) => {
      return <CustomTooltip {...props} filteredChains={filteredChains} />;
    },
    [filteredChains]
  );

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
          {t('crossChain.priceChart')}
        </h3>

        {/* Control Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-100 p-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
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
              className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
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
              className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
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
          <div className="flex items-center gap-1 bg-gray-100 p-1">
            <button
              onClick={handlePanLeft}
              className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
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
              className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
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
              className="px-2 py-1.5 text-xs bg-blue-50 text-blue-700 hover:border-blue-300 border border-transparent transition-colors"
            >
              {t('crossChain.currentPrice')}
            </button>
            <button
              onClick={() => addReferenceLine('avg')}
              className="px-2 py-1.5 text-xs bg-green-50 text-green-700 hover:border-green-300 border border-transparent transition-colors"
            >
              {t('crossChain.averagePrice')}
            </button>
            <button
              onClick={() => addReferenceLine('median')}
              className="px-2 py-1.5 text-xs bg-yellow-50 text-yellow-700 hover:border-yellow-300 border border-transparent transition-colors"
            >
              {t('crossChain.medianPrice')}
            </button>
            <button
              onClick={() => addReferenceLine('custom')}
              className="px-2 py-1.5 text-xs bg-purple-50 text-purple-700 hover:border-purple-300 border border-transparent transition-colors"
            >
              {t('crossChain.customLine')}
            </button>
            {referenceLines.length > 0 && (
              <button
                onClick={clearAllReferenceLines}
                className="px-2 py-1.5 text-xs bg-red-50 text-red-700 hover:border-red-300 border border-transparent transition-colors"
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
              className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 text-xs"
            >
              <span className="w-2 h-0.5" style={{ backgroundColor: line.color }} />
              <span className="text-gray-600">{line.label}:</span>
              <span className="font-mono text-gray-800">${line.y.toFixed(4)}</span>
              <button
                onClick={() => removeReferenceLine(line.id)}
                className="ml-1 text-gray-400 hover:text-red-500 border border-transparent hover:border-gray-200"
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
        className="h-96 relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis
              domain={priceDomain}
              tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
              width={70}
            />
            <Tooltip content={renderTooltip} />
            <Legend onClick={onLegendClick} />

            {filteredChains.map((chain) => (
              <Line
                key={chain}
                type="monotone"
                dataKey={chain}
                name={chainNames[chain]}
                stroke={chainColors[chain]}
                strokeWidth={2}
                dot={false}
                hide={hiddenLines.has(chain)}
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
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
            style={selectionBoxStyle}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 text-xs text-gray-400 flex items-center gap-4">
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
