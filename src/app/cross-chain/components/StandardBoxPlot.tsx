'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  Cell,
} from 'recharts';
import { BoxPlotData } from '../constants';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface StandardBoxPlotProps {
  data: BoxPlotData[];
  className?: string;
}

interface BoxPlotPoint {
  chain: string;
  chainName: string;
  color: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
}

interface OutlierPoint {
  chain: string;
  chainName: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: BoxPlotPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const { t } = useI18n();

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl min-w-[200px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-gray-900">{data.chainName}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">{t('crossChain.boxPlot.max')}:</span>
          <span className="font-mono text-gray-900">${data.max.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">{t('crossChain.boxPlot.q3')}:</span>
          <span className="font-mono text-gray-900">${data.q3.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 bg-blue-50 -mx-2 px-2 py-1 rounded">
          <span className="text-blue-700 font-medium">{t('crossChain.boxPlot.median')}:</span>
          <span className="font-mono text-blue-700 font-semibold">${data.median.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">{t('crossChain.boxPlot.q1')}:</span>
          <span className="font-mono text-gray-900">${data.q1.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">{t('crossChain.boxPlot.min')}:</span>
          <span className="font-mono text-gray-900">${data.min.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-2 border-t border-gray-100">
          <span className="text-gray-500">{t('crossChain.boxPlot.iqr')}:</span>
          <span className="font-mono text-gray-900">${data.iqr.toFixed(4)}</span>
        </div>
        {data.outliers.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between gap-4 mb-1">
              <span className="text-orange-600 font-medium">
                {t('crossChain.boxPlot.outliers')}:
              </span>
              <span className="font-mono text-orange-600">{data.outliers.length}</span>
            </div>
            <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
              {data.outliers.slice(0, 3).map((v, i) => (
                <span key={i} className="inline-block mr-2">
                  ${v.toFixed(2)}
                </span>
              ))}
              {data.outliers.length > 3 && <span className="text-gray-400">...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BoxPlotShapeProps {
  cx?: number;
  cy?: number;
  payload?: BoxPlotPoint;
  xAxis?: { scale: (value: number) => number };
}

function BoxPlotShape({ cx = 0, payload }: BoxPlotShapeProps) {
  if (!payload) return null;

  const { min, q1, median, q3, max, color } = payload;
  const boxWidth = 24;
  const halfWidth = boxWidth / 2;

  return (
    <g>
      {/* Lower whisker line */}
      <line x1={cx} y1={min} x2={cx} y2={q1} stroke={color} strokeWidth={1.5} />
      {/* Lower whisker cap */}
      <line
        x1={cx - halfWidth / 2}
        y1={min}
        x2={cx + halfWidth / 2}
        y2={min}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Box (Q1 to Q3) */}
      <rect
        x={cx - halfWidth}
        y={q3}
        width={boxWidth}
        height={Math.max(q1 - q3, 2)}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        rx={2}
      />
      {/* Median line */}
      <line
        x1={cx - halfWidth}
        y1={median}
        x2={cx + halfWidth}
        y2={median}
        stroke={color}
        strokeWidth={3}
      />
      {/* Upper whisker line */}
      <line x1={cx} y1={q3} x2={cx} y2={max} stroke={color} strokeWidth={1.5} />
      {/* Upper whisker cap */}
      <line
        x1={cx - halfWidth / 2}
        y1={max}
        x2={cx + halfWidth / 2}
        y2={max}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
}

export function StandardBoxPlot({ data, className = '' }: StandardBoxPlotProps) {
  const { t } = useI18n();

  const { chartData, outlierData, yDomain } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], outlierData: [], yDomain: [0, 100] };
    }

    // Transform data for the chart
    const chartDataProcessed: BoxPlotPoint[] = data.map((item) => ({
      chain: item.chain,
      chainName: item.chainName,
      color: item.color,
      min: item.min,
      q1: item.q1,
      median: item.median,
      q3: item.q3,
      max: item.max,
      outliers: item.outliers,
      iqr: item.iqr,
      lowerWhisker: item.lowerWhisker,
      upperWhisker: item.upperWhisker,
    }));

    // Collect all outlier points
    const outliersProcessed: OutlierPoint[] = [];
    data.forEach((item) => {
      item.outliers.forEach((outlier) => {
        outliersProcessed.push({
          chain: item.chain,
          chainName: item.chainName,
          value: outlier,
          color: item.color,
        });
      });
    });

    // Calculate Y domain
    const allValues = data.flatMap((d) => [d.min, d.max, ...d.outliers]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1 || 1;

    return {
      chartData: chartDataProcessed,
      outlierData: outliersProcessed,
      yDomain: [Math.max(0, minValue - padding), maxValue + padding],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        className={`h-64 py-4 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-400">{t('crossChain.noData')}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              type="number"
              domain={yDomain}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.secondaryAxis }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <YAxis
              type="category"
              dataKey="chainName"
              width={70}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 11, fill: chartColors.recharts.secondaryAxis }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Box plots */}
            <Scatter data={chartData} shape={<BoxPlotShape />} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>

            {/* Outliers */}
            {outlierData.length > 0 && (
              <Scatter
                data={outlierData}
                dataKey="value"
                name={t('crossChain.boxPlot.outliers')}
                shape="circle"
                fill={semanticColors.warning.dark}
                stroke="#fff"
                strokeWidth={1}
              >
                {outlierData.map((entry, index) => (
                  <Cell key={`outlier-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 border-2 border-gray-400 bg-gray-100 rounded-sm" />
          <span className="text-gray-600">{t('crossChain.boxPlot.legend.box')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gray-400" style={{ height: '3px' }} />
          <span className="text-gray-600">{t('crossChain.boxPlot.legend.median')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-gray-400" />
          <span className="text-gray-600">{t('crossChain.boxPlot.legend.whisker')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-gray-600">{t('crossChain.boxPlot.legend.outlier')}</span>
        </div>
      </div>
    </div>
  );
}
