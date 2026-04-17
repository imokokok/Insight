'use client';

import { useMemo } from 'react';

import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Scatter,
  Cell,
} from 'recharts';

import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';
import { safeMax, safeMin } from '@/lib/utils';

import { type BoxPlotData } from '../constants';

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
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div
      className="bg-white border p-4 min-w-[200px] rounded-lg"
      style={{ borderColor: baseColors.gray[200] }}
    >
      <div
        className="flex items-center gap-2 mb-3 pb-2 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <div className="w-3 h-3" style={{ backgroundColor: data.color }} />
        <span className="font-semibold" style={{ color: baseColors.gray[900] }}>
          {data.chainName}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{'crossChain.boxPlot.max'}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${data.max.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{'crossChain.boxPlot.q3'}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${data.q3.toFixed(4)}
          </span>
        </div>
        <div
          className="flex justify-between gap-4 border -mx-2 px-2 py-1 rounded"
          style={{
            backgroundColor: semanticColors.info.light,
            borderColor: semanticColors.info.light,
          }}
        >
          <span className="font-medium" style={{ color: semanticColors.info.text }}>
            {'crossChain.boxPlot.median'}:
          </span>
          <span className="font-mono font-semibold" style={{ color: semanticColors.info.text }}>
            ${data.median.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{'crossChain.boxPlot.q1'}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${data.q1.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{'crossChain.boxPlot.min'}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${data.min.toFixed(4)}
          </span>
        </div>
        <div
          className="flex justify-between gap-4 pt-2 border-t"
          style={{ borderColor: baseColors.gray[100] }}
        >
          <span style={{ color: baseColors.gray[500] }}>{'crossChain.boxPlot.iqr'}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${data.iqr.toFixed(4)}
          </span>
        </div>
        {data.outliers.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: baseColors.gray[100] }}>
            <div className="flex justify-between gap-4 mb-1">
              <span className="font-medium" style={{ color: semanticColors.warning.dark }}>
                {'crossChain.boxPlot.outliers'}:
              </span>
              <span className="font-mono" style={{ color: semanticColors.warning.dark }}>
                {data.outliers.length}
              </span>
            </div>
            <div
              className="text-xs max-h-20 overflow-y-auto"
              style={{ color: baseColors.gray[500] }}
            >
              {data.outliers.slice(0, 3).map((v, i) => (
                <span key={i} className="inline-block mr-2">
                  ${v.toFixed(2)}
                </span>
              ))}
              {data.outliers.length > 3 && <span style={{ color: baseColors.gray[400] }}>...</span>}
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

function BoxPlotShape({ cx: _cx, cy = 0, payload, xAxis }: BoxPlotShapeProps) {
  if (!payload || !xAxis) return null;

  const { min, q1, median, q3, max, color } = payload;
  const boxHeight = 20;
  const halfHeight = boxHeight / 2;

  // 使用 xAxis scale 将数值转换为水平坐标
  const xMin = xAxis.scale(min);
  const xQ1 = xAxis.scale(q1);
  const xMedian = xAxis.scale(median);
  const xQ3 = xAxis.scale(q3);
  const xMax = xAxis.scale(max);

  return (
    <g>
      {/* Lower whisker line (min to Q1) */}
      <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke={color} strokeWidth={1.5} />
      {/* Lower whisker cap */}
      <line
        x1={xMin}
        y1={cy - halfHeight / 2}
        x2={xMin}
        y2={cy + halfHeight / 2}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Box (Q1 to Q3) */}
      <rect
        x={Math.min(xQ1, xQ3)}
        y={cy - halfHeight}
        width={Math.abs(xQ3 - xQ1)}
        height={boxHeight}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        rx={2}
      />
      {/* Median line */}
      <line
        x1={xMedian}
        y1={cy - halfHeight}
        x2={xMedian}
        y2={cy + halfHeight}
        stroke={color}
        strokeWidth={2}
      />
      {/* Upper whisker line (Q3 to max) */}
      <line x1={xQ3} y1={cy} x2={xMax} y2={cy} stroke={color} strokeWidth={1.5} />
      {/* Upper whisker cap */}
      <line
        x1={xMax}
        y1={cy - halfHeight / 2}
        x2={xMax}
        y2={cy + halfHeight / 2}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
}

export function StandardBoxPlot({ data, className = '' }: StandardBoxPlotProps) {
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
    const minValue = safeMin(allValues);
    const maxValue = safeMax(allValues);
    const padding = (maxValue - minValue) * 0.1 || 1;

    return {
      chartData: chartDataProcessed,
      outlierData: outliersProcessed,
      yDomain: [Math.max(0, minValue - padding), maxValue + padding],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className={`h-64 py-4 flex items-center justify-center ${className}`}>
        <span style={{ color: baseColors.gray[400] }}>{'crossChain.noData'}</span>
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
            <RechartsTooltip content={<CustomTooltip />} />

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
                name={'crossChain.boxPlot.outliers'}
                shape="circle"
                fill={semanticColors.warning.dark}
                stroke={baseColors.gray[50]}
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
          <div
            className="w-6 h-4 border-2"
            style={{ borderColor: baseColors.gray[400], backgroundColor: baseColors.gray[100] }}
          />
          <span style={{ color: baseColors.gray[600] }}>{'crossChain.boxPlot.legend.box'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-0.5"
            style={{ backgroundColor: baseColors.gray[400], height: '3px' }}
          />
          <span style={{ color: baseColors.gray[600] }}>{'crossChain.boxPlot.legend.median'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4" style={{ backgroundColor: baseColors.gray[400] }} />
          <span style={{ color: baseColors.gray[600] }}>{'crossChain.boxPlot.legend.whisker'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: semanticColors.warning.main }} />
          <span style={{ color: baseColors.gray[600] }}>{'crossChain.boxPlot.legend.outlier'}</span>
        </div>
      </div>
    </div>
  );
}
