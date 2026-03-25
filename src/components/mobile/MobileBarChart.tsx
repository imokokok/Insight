'use client';

import { useState, useCallback, useRef, memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTranslations } from '@/i18n';
import { ChartSkeleton } from '@/components/ui';
import { chartColors } from '@/lib/config/colors';


interface DataPoint {
  name: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

interface MobileBarChartProps {
  data: DataPoint[];
  height?: number;
  isLoading?: boolean;
  showGrid?: boolean;
  barColor?: string;
  onBarClick?: (point: DataPoint, index: number) => void;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string, props: { payload: DataPoint }) => string;
}

interface TouchState {
  startX: number;
  isPanning: boolean;
}

function MobileBarChartBase({
  data,
  height = 200,
  isLoading = false,
  showGrid = true,
  barColor = chartColors.recharts.primaryLight,
  onBarClick,
  yAxisFormatter = (value) => `${value}`,
  tooltipFormatter,
}: MobileBarChartProps) {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<TouchState>({
    startX: 0,
    isPanning: false,
  });

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(8, data.length) });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const visibleData = data.slice(visibleRange.start, visibleRange.end);

  // Touch handlers for horizontal scroll
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = {
        startX: e.touches[0].clientX,
        isPanning: true,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchState.current.isPanning || e.touches.length !== 1) return;

      const deltaX = touchState.current.startX - e.touches[0].clientX;
      const threshold = 50;

      if (Math.abs(deltaX) > threshold) {
        const direction = deltaX > 0 ? 1 : -1;
        const step = Math.min(3, Math.floor(Math.abs(deltaX) / threshold));

        setVisibleRange((prev) => {
          const range = prev.end - prev.start;
          let newStart = prev.start + direction * step;
          let newEnd = newStart + range;

          if (newStart < 0) {
            newStart = 0;
            newEnd = range;
          }
          if (newEnd > data.length) {
            newEnd = data.length;
            newStart = Math.max(0, newEnd - range);
          }

          return { start: newStart, end: newEnd };
        });

        touchState.current.startX = e.touches[0].clientX;
      }
    },
    [data.length]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current.isPanning = false;
  }, []);

  const handleBarClick = useCallback(
    (data: unknown, index: number) => {
      const barData = data as { payload?: DataPoint };
      const actualIndex = visibleRange.start + index;
      setSelectedIndex(actualIndex);
      if (barData.payload) {
        onBarClick?.(barData.payload, actualIndex);
      }
    },
    [onBarClick, visibleRange.start]
  );

  if (isLoading) {
    return <ChartSkeleton height={height} showToolbar={false} variant="bar" />;
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-gray-200"
        style={{ height }}
      >
        <p className="text-sm text-gray-500">{t('status.noData')}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart */}
      <div
        ref={chartRef}
        className="relative touch-pan-x"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} margin={{ top: 10, right: 5, left: 0, bottom: 20 }}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                strokeOpacity={0.3}
                vertical={false}
              />
            )}

            <XAxis
              dataKey="name"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={40}
            />

            <YAxis
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              tickFormatter={yAxisFormatter}
              width={40}
            />

            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload[0]) {
                  const value = payload[0].value as number;
                  const name = String(label || '');
                  const props = payload[0].payload as DataPoint;
                  const formattedValue = tooltipFormatter
                    ? tooltipFormatter(value, name, { payload: props })
                    : yAxisFormatter(value);

                  return (
                    <div className="bg-white p-2 border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-semibold text-gray-900">{formattedValue}</p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: `${chartColors.recharts.primaryLight}10` }}
            />

            <Bar dataKey="value" radius={[2, 2, 0, 0]} onClick={handleBarClick}>
              {visibleData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || barColor}
                  stroke={
                    selectedIndex === visibleRange.start + index
                      ? chartColors.recharts.primaryDark
                      : 'none'
                  }
                  strokeWidth={selectedIndex === visibleRange.start + index ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Scroll hint */}
        {data.length > visibleRange.end - visibleRange.start && (
          <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 text-[10px] text-gray-500">
            👈 {t('mobile.chart.swipe')} 👉
          </div>
        )}
      </div>

      {/* Pagination indicator */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {Array.from({
          length: Math.ceil(data.length / (visibleRange.end - visibleRange.start)),
        }).map((_, i) => {
          const pageStart = i * (visibleRange.end - visibleRange.start);
          const isActive =
            visibleRange.start >= pageStart &&
            visibleRange.start < pageStart + (visibleRange.end - visibleRange.start);
          return (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isActive ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

const MobileBarChart = memo(MobileBarChartBase);
export { MobileBarChart };
export default MobileBarChart;
