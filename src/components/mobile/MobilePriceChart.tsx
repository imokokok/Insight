'use client';

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { useTranslations } from '@/i18n';
import { ChartSkeleton } from '@/components/ui';
import { chartColors, baseColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';


const logger = createLogger('MobilePriceChart');

interface DataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma7?: number;
  ma30?: number;
}

interface MobilePriceChartProps {
  data: DataPoint[];
  symbol: string;
  height?: number;
  showVolume?: boolean;
  showMA?: boolean;
  isLoading?: boolean;
  onPointClick?: (point: DataPoint) => void;
  onZoomChange?: (zoom: { start: number; end: number }) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number;
  isPinching: boolean;
  isPanning: boolean;
  lastTouchTime: number;
}

function MobilePriceChartBase({
  data,
  symbol,
  height = 280,
  showVolume = false,
  showMA = false,
  isLoading = false,
  onPointClick,
  onZoomChange,
}: MobilePriceChartProps) {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startDistance: 0,
    isPinching: false,
    isPanning: false,
    lastTouchTime: 0,
  });

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(50, data.length) });
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percentage: 0 };
    const current = data[data.length - 1].price;
    const previous = data[0].price;
    const value = current - previous;
    const percentage = (value / previous) * 100;
    return { value, percentage };
  }, [data]);

  // Get visible data
  const visibleData = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end);
  }, [data, visibleRange]);

  // Calculate price range
  const priceRange = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 100 };
    const prices = visibleData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [visibleData]);

  // Touch handlers for pinch zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    const now = Date.now();

    if (touches.length === 2) {
      // Pinch start
      const distance = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      touchState.current = {
        ...touchState.current,
        startDistance: distance,
        isPinching: true,
        lastTouchTime: now,
      };
    } else if (touches.length === 1) {
      // Pan start
      touchState.current = {
        ...touchState.current,
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        isPanning: true,
        lastTouchTime: now,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const { isPinching, isPanning, startDistance, startX } = touchState.current;

      if (isPinching && touches.length === 2) {
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        );
        const scale = distance / startDistance;
        const currentRange = visibleRange.end - visibleRange.start;
        const newRange = Math.max(10, Math.min(data.length, Math.round(currentRange / scale)));
        const center = (visibleRange.start + visibleRange.end) / 2;
        const newStart = Math.max(0, Math.round(center - newRange / 2));
        const newEnd = Math.min(data.length, Math.round(center + newRange / 2));

        setVisibleRange({ start: newStart, end: newEnd });
        onZoomChange?.({ start: newStart, end: newEnd });
      } else if (isPanning && touches.length === 1) {
        const deltaX = touches[0].clientX - startX;
        const sensitivity = 0.5;
        const pointDelta = Math.round((deltaX * sensitivity) / 10);

        if (Math.abs(pointDelta) > 0) {
          const newStart = Math.max(
            0,
            Math.min(
              data.length - (visibleRange.end - visibleRange.start),
              visibleRange.start - pointDelta
            )
          );
          const newEnd = newStart + (visibleRange.end - visibleRange.start);

          setVisibleRange({ start: newStart, end: newEnd });
          touchState.current.startX = touches[0].clientX;
        }
      }
    },
    [data.length, visibleRange, onZoomChange]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current = {
      ...touchState.current,
      isPinching: false,
      isPanning: false,
    };
  }, []);

  // Handle chart click
  const handleChartClick = useCallback(
    (e: unknown) => {
      const event = e as { activePayload?: Array<{ payload: DataPoint }> } | null;
      if (event && event.activePayload && event.activePayload[0]) {
        const point = event.activePayload[0].payload as DataPoint;
        setSelectedPoint(point);
        onPointClick?.(point);
      }
    },
    [onPointClick]
  );

  // Reset zoom when data changes
  useEffect(() => {
    setVisibleRange({ start: 0, end: Math.min(50, data.length) });
  }, [data.length]);

  if (isLoading) {
    return <ChartSkeleton height={height} showToolbar={false} variant="price" />;
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-gray-200"
        style={{ height }}
      >
        <div className="text-center">
          <Minus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">{t('status.noData')}</p>
        </div>
      </div>
    );
  }

  const ChangeIcon = priceChange.percentage >= 0 ? TrendingUp : TrendingDown;
  const changeColor = priceChange.percentage >= 0 ? 'text-success-600' : 'text-danger-600';
  const currentPrice = data[data.length - 1]?.price || 0;

  return (
    <div className="w-full">
      {/* Price Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <ChangeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {priceChange.percentage >= 0 ? '+' : ''}
              {priceChange.percentage.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {visibleRange.start + 1}-{visibleRange.end} / {data.length}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            onClick={handleChartClick}
            margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              strokeOpacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              minTickGap={30}
              interval="preserveStartEnd"
            />

            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
              width={35}
            />

            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const point = payload[0].payload as DataPoint;
                  return (
                    <div className="bg-white p-2 border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-500">{point.time}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${point.price.toFixed(2)}
                      </p>
                      {point.volume && (
                        <p className="text-xs text-gray-500">
                          Vol: {(point.volume / 1000).toFixed(1)}K
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{
                stroke: chartColors.recharts.border,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill={chartColors.recharts.primaryLight}
                fillOpacity={0.2}
                stroke="none"
              />
            )}

            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke={chartColors.recharts.primaryLight}
              strokeWidth={2}
              fill={`${chartColors.recharts.primaryLight}20`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.recharts.primaryDark }}
            />

            {showMA && (
              <>
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma7"
                  stroke={chartColors.recharts.warning}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma30"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Touch gesture hint */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/80 px-2 py-1 text-[10px] text-gray-500">
          <span>👆 {t('mobile.chart.pan')}</span>
          <span className="mx-1">|</span>
          <span>🤏 {t('mobile.chart.zoom')}</span>
        </div>
      </div>

      {/* Selected Point Info */}
      {selectedPoint && (
        <div className="px-3 py-2 bg-primary-50 border-t border-primary-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{selectedPoint.time}</span>
            <span className="text-sm font-semibold text-gray-900">
              ${selectedPoint.price.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const MobilePriceChart = memo(MobilePriceChartBase);
export { MobilePriceChart };
export default MobilePriceChart;
