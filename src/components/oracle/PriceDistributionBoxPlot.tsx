'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ZAxis,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  outliers: number[];
  whiskerMin: number;
  whiskerMax: number;
}

interface OraclePriceData {
  oracleId: string;
  prices: number[];
}

interface PriceDistributionBoxPlotProps {
  data: OraclePriceData[];
  oracleNames?: Record<string, string>;
  className?: string;
  title?: string;
}

const DEFAULT_ORACLE_COLORS: Record<string, string> = {
  chainlink: '#375BD2',
  'band-protocol': '#9B51E0',
  uma: '#FF6B6B',
  'pyth-network': '#EC4899',
  api3: '#10B981',
};

function calculateBoxPlotStats(prices: number[]): BoxPlotStats {
  if (prices.length === 0) {
    return {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      iqr: 0,
      outliers: [],
      whiskerMin: 0,
      whiskerMax: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = n % 2 === 0 ? sorted.slice(n / 2) : sorted.slice(Math.floor(n / 2) + 1);

  const q1 =
    lowerHalf.length > 0
      ? lowerHalf.length % 2 === 0
        ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
        : lowerHalf[Math.floor(lowerHalf.length / 2)]
      : sorted[0];

  const q3 =
    upperHalf.length > 0
      ? upperHalf.length % 2 === 0
        ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
        : upperHalf[Math.floor(upperHalf.length / 2)]
      : sorted[sorted.length - 1];

  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = sorted.filter((p) => p < lowerBound || p > upperBound);

  const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
  const whiskerMin = nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1;
  const whiskerMax = nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1,
    median,
    q3,
    iqr,
    outliers,
    whiskerMin,
    whiskerMax,
  };
}

interface BoxPlotShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    stats: BoxPlotStats;
    color: string;
    name: string;
  };
}

function BoxPlotShape({ x = 0, width = 0, payload }: BoxPlotShapeProps) {
  if (!payload) return null;

  const { stats, color } = payload;
  const centerX = x + width / 2;
  const boxWidth = Math.max(width * 0.6, 20);

  const allValues = [stats.whiskerMin, stats.q1, stats.median, stats.q3, stats.whiskerMax];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const scaleY = (val: number) => {
    const chartHeight = 280;
    const padding = 40;
    const availableHeight = chartHeight - padding * 2;
    return padding + ((maxVal - val) / range) * availableHeight;
  };

  const whiskerMinY = scaleY(stats.whiskerMin);
  const whiskerMaxY = scaleY(stats.whiskerMax);
  const q1Y = scaleY(stats.q1);
  const q3Y = scaleY(stats.q3);
  const medianY = scaleY(stats.median);

  return (
    <g>
      <line x1={centerX} y1={whiskerMinY} x2={centerX} y2={q1Y} stroke={color} strokeWidth={2} />
      <line
        x1={centerX - boxWidth / 4}
        y1={whiskerMinY}
        x2={centerX + boxWidth / 4}
        y2={whiskerMinY}
        stroke={color}
        strokeWidth={2}
      />
      <rect
        x={centerX - boxWidth / 2}
        y={q3Y}
        width={boxWidth}
        height={Math.max(q1Y - q3Y, 2)}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        rx={2}
      />
      <line
        x1={centerX - boxWidth / 2}
        y1={medianY}
        x2={centerX + boxWidth / 2}
        y2={medianY}
        stroke={color}
        strokeWidth={3}
      />
      <line x1={centerX} y1={q3Y} x2={centerX} y2={whiskerMaxY} stroke={color} strokeWidth={2} />
      <line
        x1={centerX - boxWidth / 4}
        y1={whiskerMaxY}
        x2={centerX + boxWidth / 4}
        y2={whiskerMaxY}
        stroke={color}
        strokeWidth={2}
      />
    </g>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      stats: BoxPlotStats;
      color: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const { name, stats, color } = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl max-w-xs">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-gray-900">{name}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">最大值:</span>
          <span className="font-mono text-gray-900">${stats.max.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">上须:</span>
          <span className="font-mono text-gray-900">${stats.whiskerMax.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Q3 (75%):</span>
          <span className="font-mono text-gray-900">${stats.q3.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 bg-blue-50 -mx-2 px-2 py-1 rounded">
          <span className="text-blue-700 font-medium">中位数:</span>
          <span className="font-mono text-blue-700 font-semibold">${stats.median.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Q1 (25%):</span>
          <span className="font-mono text-gray-900">${stats.q1.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">下须:</span>
          <span className="font-mono text-gray-900">${stats.whiskerMin.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">最小值:</span>
          <span className="font-mono text-gray-900">${stats.min.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-2 border-t border-gray-100">
          <span className="text-gray-500">IQR:</span>
          <span className="font-mono text-gray-900">${stats.iqr.toFixed(4)}</span>
        </div>
        {stats.outliers.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between gap-4 mb-1">
              <span className="text-orange-600 font-medium">离群值:</span>
              <span className="font-mono text-orange-600">{stats.outliers.length} 个</span>
            </div>
            <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
              {stats.outliers.slice(0, 5).map((v, i) => (
                <span key={i} className="inline-block mr-2">
                  ${v.toFixed(2)}
                </span>
              ))}
              {stats.outliers.length > 5 && <span className="text-gray-400">...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PriceDistributionBoxPlot({
  data,
  oracleNames = {},
  className = '',
  title = '价格分布箱线图',
}: PriceDistributionBoxPlotProps) {
  const { chartData, outliersData, yDomain } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], outliersData: [], yDomain: [0, 100] };
    }

    const processedData = data.map((item) => {
      const stats = calculateBoxPlotStats(item.prices);
      const name = oracleNames[item.oracleId] || item.oracleId;
      const color = DEFAULT_ORACLE_COLORS[item.oracleId] || '#6B7280';

      return {
        oracleId: item.oracleId,
        name,
        stats,
        color,
      };
    });

    const chartDataProcessed = processedData.map((item, index) => ({
      x: index,
      y: item.stats.median,
      stats: item.stats,
      color: item.color,
      name: item.name,
      oracleId: item.oracleId,
    }));

    const outliersProcessed: Array<{
      x: number;
      y: number;
      color: string;
      name: string;
      value: number;
    }> = [];

    processedData.forEach((item, index) => {
      item.stats.outliers.forEach((outlier) => {
        outliersProcessed.push({
          x: index,
          y: outlier,
          color: item.color,
          name: item.name,
          value: outlier,
        });
      });
    });

    const allPrices = data.flatMap((item) => item.prices);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1 || 10;

    return {
      chartData: chartDataProcessed,
      outliersData: outliersProcessed,
      yDomain: [Math.max(0, minPrice - padding), maxPrice + padding],
    };
  }, [data, oracleNames]);

  const xAxisData = useMemo(() => {
    return chartData.map((item) => ({
      x: item.x,
      name: item.name,
    }));
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <DashboardCard title={title} className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title} className={className}>
      <div className="space-y-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[-0.5, chartData.length - 0.5]}
                ticks={chartData.map((_, i) => i)}
                tickFormatter={(value) => {
                  const item = chartData[value];
                  return item?.name || '';
                }}
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                type="number"
                domain={yDomain}
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                width={70}
              />
              <ZAxis type="number" range={[100, 100]} />
              <Tooltip content={<CustomTooltip />} />

              <Scatter data={chartData} shape={<BoxPlotShape />}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>

              {outliersData.length > 0 && (
                <Scatter data={outliersData} shape="circle">
                  {outliersData.map((entry, index) => (
                    <Cell
                      key={`outlier-${index}`}
                      fill={entry.color}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">图例说明</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 border-2 border-blue-500 bg-blue-100 rounded-sm" />
              <span className="text-gray-600">箱体 (Q1-Q3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-500" style={{ height: '3px' }} />
              <span className="text-gray-600">中位数</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-blue-500" />
              <span className="text-gray-600">须线 (1.5×IQR)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-600">离群值</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">统计摘要</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">预言机</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">中位数</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Q1</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Q3</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">IQR</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">离群值</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item) => (
                  <tr key={item.oracleId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-gray-900">
                      ${item.stats.median.toFixed(4)}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-gray-600">
                      ${item.stats.q1.toFixed(4)}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-gray-600">
                      ${item.stats.q3.toFixed(4)}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-gray-600">
                      ${item.stats.iqr.toFixed(4)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {item.stats.outliers.length > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {item.stats.outliers.length}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export type { OraclePriceData, BoxPlotStats };
