'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Brush,
  Legend,
  Area,
} from 'recharts';
import { ChartGuide, useChartGuide } from '../ChartGuide';
import { EnhancedChartToolbar, ToolbarGroup } from '../ChartToolbar';
import { EnhancedTooltip, MultiSeriesTooltip } from '../EnhancedTooltip';
import { ChartExportData } from '@/utils/chartExport';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';


const logger = createLogger('InteractivePriceChart');

// Types
export interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  ma7?: number;
  ma14?: number;
  ma30?: number;
  comparisonPrice?: number;
  [key: string]: unknown;
}

export interface InteractivePriceChartProps {
  data: ChartDataPoint[];
  symbol: string;
  comparisonData?: ChartDataPoint[];
  height?: number;
  showGuide?: boolean;
  chartId?: string;
  isMobile?: boolean;
  className?: string;
}

export function InteractivePriceChart({
  data,
  symbol,
  comparisonData,
  height = 500,
  showGuide = true,
  chartId = 'default-chart',
  isMobile = false,
  className = '',
}: InteractivePriceChartProps) {
  const t = useTranslations('interactiveChart');
  const chartContainerRef = useRef<HTMLDivElement>(null!);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMA7, setShowMA7] = useState(true);
  const [showMA14, setShowMA14] = useState(false);
  const [showMA30, setShowMA30] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showComparison, setShowComparison] = useState(!!comparisonData);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  const { shouldShowGuide, resetGuide } = useChartGuide(chartId);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percent: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    return { value: change, percent };
  }, [data]);

  const currentPrice = data[data.length - 1]?.price || 0;

  // Prepare export data
  const exportData: ChartExportData[] = useMemo(
    () =>
      data.map((d) => ({
        time: d.time,
        timestamp: d.timestamp,
        price: d.price,
        volume: d.volume,
        ma7: d.ma7,
        ma14: d.ma14,
        ma30: d.ma30,
      })),
    [data]
  );

  // Toolbar button groups
  const toolbarGroups: ToolbarGroup[] = useMemo(
    () => [
      {
        id: 'indicators',
        title: t('toolbar.indicators'),
        buttons: [
          {
            id: 'ma7',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
            label: 'MA7',
            tooltip: t('tooltips.ma7'),
            onClick: () => setShowMA7(!showMA7),
            isActive: showMA7,
            shortcut: '7',
          },
          {
            id: 'ma14',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
            label: 'MA14',
            tooltip: t('tooltips.ma14'),
            onClick: () => setShowMA14(!showMA14),
            isActive: showMA14,
            shortcut: '4',
          },
          {
            id: 'ma30',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ),
            label: 'MA30',
            tooltip: t('tooltips.ma30'),
            onClick: () => setShowMA30(!showMA30),
            isActive: showMA30,
            shortcut: '3',
          },
        ],
      },
      {
        id: 'view',
        title: t('toolbar.view'),
        buttons: [
          {
            id: 'volume',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            ),
            label: t('buttons.volume'),
            tooltip: t('tooltips.volume'),
            onClick: () => setShowVolume(!showVolume),
            isActive: showVolume,
            shortcut: 'V',
          },
          ...(comparisonData
            ? [
                {
                  id: 'comparison',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  ),
                  label: t('buttons.comparison'),
                  tooltip: t('tooltips.comparison'),
                  onClick: () => setShowComparison(!showComparison),
                  isActive: showComparison,
                  shortcut: 'C',
                },
              ]
            : []),
        ],
      },
    ],
    [showMA7, showMA14, showMA30, showVolume, showComparison, comparisonData, t]
  );

  // Handle fullscreen change
  const handleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    logger.info('Chart refresh requested');
    // Implement refresh logic here
  }, []);

  // Custom tooltip content
  const CustomTooltipContent = useCallback(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ dataKey: string; value: number; color: string; payload: ChartDataPoint }>;
      label?: string;
    }) => {
      if (!active || !payload || payload.length === 0) return null;

      const seriesNames: Record<string, string> = {
        price: t('series.price'),
        comparisonPrice: t('series.comparison'),
        ma7: 'MA7',
        ma14: 'MA14',
        ma30: 'MA30',
      };

      return (
        <MultiSeriesTooltip
          active={active}
          payload={payload.map((p) => ({
            dataKey: p.dataKey,
            value: p.value,
            color: p.color,
            payload: p.payload,
            name: seriesNames[p.dataKey] || p.dataKey,
          }))}
          label={label}
          seriesNames={seriesNames}
          isMobile={isMobile}
        />
      );
    },
    [isMobile, t]
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chart Guide */}
      {showGuide && shouldShowGuide && (
        <ChartGuide chartId={chartId} onClose={() => logger.info('Chart guide closed')} />
      )}

      {/* Enhanced Toolbar */}
      <EnhancedChartToolbar
        symbol={symbol}
        currentPrice={currentPrice}
        priceChange={priceChange}
        chartContainerRef={chartContainerRef}
        exportData={exportData}
        groups={toolbarGroups}
        showFullscreen={true}
        showExport={true}
        showRefresh={true}
        showSettings={false}
        onRefresh={handleRefresh}
        onFullscreen={handleFullscreen}
        isFullscreen={isFullscreen}
        isMobile={isMobile}
        className="mb-4"
      />

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 p-4"
        style={{ backgroundColor: baseColors.gray[50] }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              minTickGap={isMobile ? 60 : 40}
              interval="preserveStartEnd"
            />

            <YAxis
              yAxisId="price"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              tickFormatter={(value) => `$${Number(value).toFixed(isMobile ? 0 : 2)}`}
              width={isMobile ? 35 : 60}
            />

            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={false}
              hide
            />

            <RechartsTooltip content={<CustomTooltipContent />} />

            {showComparison && comparisonData && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => (
                  <span style={{ color: baseColors.gray[600], fontSize: '12px' }}>
                    {value === 'price' ? t('legend.current') : t('legend.comparison')}
                  </span>
                )}
              />
            )}

            {/* Volume Bars */}
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill={chartColors.recharts.primaryLight}
                fillOpacity={0.2}
                stroke="none"
              />
            )}

            {/* Main Price Line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke={chartColors.recharts.primaryLight}
              strokeWidth={isMobile ? 1.5 : 2}
              dot={false}
              activeDot={{
                r: isMobile ? 3 : 4,
                strokeWidth: 0,
                fill: chartColors.recharts.primaryDark,
              }}
              name="price"
            />

            {/* Comparison Line */}
            {showComparison && comparisonData && (
              <Line
                yAxisId="price"
                type="monotone"
                data={comparisonData}
                dataKey="price"
                stroke={chartColors.recharts.purple}
                strokeWidth={isMobile ? 1.5 : 2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{
                  r: isMobile ? 3 : 4,
                  strokeWidth: 0,
                  fill: chartColors.recharts.purpleDark,
                }}
                name="comparisonPrice"
              />
            )}

            {/* Moving Averages */}
            {showMA7 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma7"
                stroke={chartColors.recharts.warning}
                strokeWidth={isMobile ? 1 : 1.5}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="ma7"
              />
            )}
            {showMA14 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma14"
                stroke={chartColors.recharts.success}
                strokeWidth={1.5}
                strokeDasharray="10 5"
                dot={false}
                activeDot={false}
                name="ma14"
              />
            )}
            {showMA30 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma30"
                stroke={chartColors.recharts.purple}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                name="ma30"
              />
            )}

            {/* Brush for zooming */}
            <Brush
              dataKey="time"
              height={isMobile ? 20 : 30}
              stroke={chartColors.recharts.primaryLight}
              fill={chartColors.recharts.backgroundLight}
              tickFormatter={() => ''}
              onChange={setBrushRange}
              startIndex={brushRange.startIndex}
              endIndex={brushRange.endIndex}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5" style={{ backgroundColor: chartColors.recharts.primary }} />
          <span className="text-xs" style={{ color: baseColors.gray[500] }}>
            {t('legend.price')}
          </span>
        </div>
        {showComparison && comparisonData && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5"
              style={{ borderTop: `2px dashed ${chartColors.recharts.purple}` }}
            />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('legend.comparison')}
            </span>
          </div>
        )}
        {showMA7 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5"
              style={{ borderTop: `2px dashed ${chartColors.recharts.warning}` }}
            />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              MA7
            </span>
          </div>
        )}
        {showMA14 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5"
              style={{ borderTop: `2px dashed ${chartColors.recharts.success}` }}
            />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              MA14
            </span>
          </div>
        )}
        {showMA30 && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5"
              style={{ borderTop: `2px dashed ${chartColors.recharts.purple}` }}
            />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              MA30
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InteractivePriceChart;
