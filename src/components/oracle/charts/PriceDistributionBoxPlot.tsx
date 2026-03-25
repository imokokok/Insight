'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ZAxis,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';


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
  chainlink: chartColors.oracle.chainlink,
  'band-protocol': chartColors.oracle['band-protocol'],
  uma: chartColors.oracle.uma,
  'pyth-network': chartColors.oracle.pyth,
  api3: chartColors.oracle.api3,
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
  t: (key: string) => string;
}

function CustomTooltip({ active, payload, t }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const { name, stats, color } = payload[0].payload;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 max-w-xs"
      style={{ boxShadow: `0 4px 6px -1px ${baseColors.gray[900]}1A` }}
    >
      <div
        className="flex items-center gap-2 mb-3 pb-2 border-b"
        style={{ borderColor: baseColors.gray[100] }}
      >
        <div className="w-3 h-3" style={{ backgroundColor: color }} />
        <span className="font-semibold" style={{ color: baseColors.gray[900] }}>
          {name}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{t('priceDistribution.tooltip.max')}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.max.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>
            {t('priceDistribution.tooltip.upperWhisker')}:
          </span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.whiskerMax.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{t('priceDistribution.tooltip.q3')}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.q3.toFixed(4)}
          </span>
        </div>
        <div
          className="flex justify-between gap-4 -mx-2 px-2 py-1 rounded"
          style={{ backgroundColor: baseColors.primary[50] }}
        >
          <span className="font-medium" style={{ color: baseColors.primary[700] }}>
            {t('priceDistribution.tooltip.median')}:
          </span>
          <span className="font-mono font-semibold" style={{ color: baseColors.primary[700] }}>
            ${stats.median.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{t('priceDistribution.tooltip.q1')}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.q1.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>
            {t('priceDistribution.tooltip.lowerWhisker')}:
          </span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.whiskerMin.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: baseColors.gray[500] }}>{t('priceDistribution.tooltip.min')}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.min.toFixed(4)}
          </span>
        </div>
        <div
          className="flex justify-between gap-4 pt-2"
          style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}
        >
          <span style={{ color: baseColors.gray[500] }}>{t('priceDistribution.tooltip.iqr')}:</span>
          <span className="font-mono" style={{ color: baseColors.gray[900] }}>
            ${stats.iqr.toFixed(4)}
          </span>
        </div>
        {stats.outliers.length > 0 && (
          <div className="pt-2" style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}>
            <div className="flex justify-between gap-4 mb-1">
              <span className="font-medium" style={{ color: semanticColors.warning.dark }}>
                {t('priceDistribution.tooltip.outliers')}:
              </span>
              <span className="font-mono" style={{ color: semanticColors.warning.dark }}>
                {stats.outliers.length} {t('priceDistribution.tooltip.outlierCount')}
              </span>
            </div>
            <div
              className="text-xs max-h-20 overflow-y-auto"
              style={{ color: baseColors.gray[500] }}
            >
              {stats.outliers.slice(0, 5).map((v, i) => (
                <span key={i} className="inline-block mr-2">
                  ${v.toFixed(2)}
                </span>
              ))}
              {stats.outliers.length > 5 && (
                <span style={{ color: baseColors.gray[400] }}>...</span>
              )}
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
  title,
}: PriceDistributionBoxPlotProps) {
  const t = useTranslations();
  const chartTitle = title || t('priceDistribution.title');

  const { chartData, outliersData, yDomain } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], outliersData: [], yDomain: [0, 100] };
    }

    const processedData = data.map((item) => {
      const stats = calculateBoxPlotStats(item.prices);
      const name = oracleNames[item.oracleId] || item.oracleId;
      const color = DEFAULT_ORACLE_COLORS[item.oracleId] || baseColors.gray[500];

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
      <DashboardCard title={chartTitle} className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">
          {t('priceDistribution.noData')}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={chartTitle} className={className}>
      <div className="space-y-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                vertical={false}
              />
              <XAxis
                dataKey="x"
                type="number"
                domain={[-0.5, chartData.length - 0.5]}
                ticks={chartData.map((_, i) => i)}
                tickFormatter={(value) => {
                  const item = chartData[value];
                  return item?.name || '';
                }}
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickLine={false}
                axisLine={{ stroke: chartColors.recharts.grid }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                type="number"
                domain={yDomain}
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickLine={false}
                axisLine={{ stroke: chartColors.recharts.grid }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                width={70}
              />
              <ZAxis type="number" range={[100, 100]} />
              <RechartsTooltip content={<CustomTooltip t={t} />} />

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
                      stroke={chartColors.recharts.white}
                      strokeWidth={1}
                    />
                  ))}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-4" style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}>
          <h4 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[700] }}>
            {t('priceDistribution.legend.title')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-4 border-2 rounded-sm"
                style={{
                  borderColor: baseColors.primary[500],
                  backgroundColor: baseColors.primary[100],
                }}
              />
              <span style={{ color: baseColors.gray[600] }}>
                {t('priceDistribution.legend.box')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-0.5"
                style={{ height: '3px', backgroundColor: baseColors.primary[500] }}
              />
              <span style={{ color: baseColors.gray[600] }}>
                {t('priceDistribution.legend.median')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4" style={{ backgroundColor: baseColors.primary[500] }} />
              <span style={{ color: baseColors.gray[600] }}>
                {t('priceDistribution.legend.whisker')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2"
                style={{ backgroundColor: semanticColors.warning.DEFAULT }}
              />
              <span style={{ color: baseColors.gray[600] }}>
                {t('priceDistribution.legend.outlier')}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('priceDistribution.stats.title')}
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.oracle')}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.median')}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.q1')}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.q3')}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.iqr')}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    {t('priceDistribution.stats.outliers')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item) => (
                  <tr key={item.oracleId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
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
                        <span className="text-warning-600 font-medium">
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
