'use client';

import { useMemo } from 'react';

import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { providerNames, chainNames } from '@/lib/constants';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

import { type QueryResult } from '../constants';

interface PriceDeviationChartProps {
  queryResults: QueryResult[];
  avgPrice: number;
}

interface DeviationData {
  key: string;
  provider: string;
  chain: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  color: string;
}

const DEVIATION_THRESHOLD = 0.5; // 0.5% threshold for warning
const DANGER_THRESHOLD = 1.0; // 1% threshold for danger

function getDeviationColor(percent: number) {
  const absPercent = Math.abs(percent);
  if (absPercent > DANGER_THRESHOLD) return '#ef4444'; // red-500
  if (absPercent > DEVIATION_THRESHOLD) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
}

function getDeviationStatus(percent: number) {
  const absPercent = Math.abs(percent);
  if (absPercent > DANGER_THRESHOLD) return 'danger';
  if (absPercent > DEVIATION_THRESHOLD) return 'warning';
  return 'normal';
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DeviationData }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const status = getDeviationStatus(data.deviationPercent);

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{data.provider}</p>
        <p className="text-xs text-gray-500 mb-2">{data.chain}</p>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-600">Price: </span>
            <span className="font-medium">{formatPrice(data.price)}</span>
          </p>
          <p>
            <span className="text-gray-600">Deviation: </span>
            <span
              className={`font-medium ${
                status === 'danger'
                  ? 'text-red-600'
                  : status === 'warning'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {data.deviationPercent > 0 ? '+' : ''}
              {data.deviationPercent.toFixed(4)}%
            </span>
          </p>
          <p>
            <span className="text-gray-600">Diff: </span>
            <span className="font-medium">
              {data.deviation > 0 ? '+' : ''}
              {formatPrice(data.deviation)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function PriceDeviationChart({ queryResults, avgPrice }: PriceDeviationChartProps) {
  const deviationData = useMemo<DeviationData[]>(() => {
    if (queryResults.length === 0 || avgPrice === 0) return [];

    return queryResults.map((result, index) => {
      const price = result.priceData.price;
      const deviation = price - avgPrice;
      const deviationPercent = (deviation / avgPrice) * 100;
      const key = `${result.provider}_${result.chain}`;

      return {
        key,
        provider: providerNames[result.provider] || result.provider,
        chain: chainNames[result.chain] || result.chain,
        price,
        deviation,
        deviationPercent,
        color: chartColors.sequence[index % chartColors.sequence.length],
      };
    });
  }, [queryResults, avgPrice]);

  const stats = useMemo(() => {
    if (deviationData.length === 0) return null;

    const maxDeviation = Math.max(...deviationData.map((d) => Math.abs(d.deviationPercent)));
    const avgDeviation =
      deviationData.reduce((sum, d) => sum + Math.abs(d.deviationPercent), 0) /
      deviationData.length;
    const outliers = deviationData.filter(
      (d) => Math.abs(d.deviationPercent) > DEVIATION_THRESHOLD
    );

    return {
      maxDeviation,
      avgDeviation,
      outliers,
      total: deviationData.length,
    };
  }, [deviationData]);

  if (deviationData.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No deviation data available</p>
        <p className="text-xs mt-1 text-gray-500">
          Query prices from multiple oracles to see deviation analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Max Deviation</p>
            <p
              className={`text-lg font-bold ${
                stats.maxDeviation > DANGER_THRESHOLD
                  ? 'text-red-600'
                  : stats.maxDeviation > DEVIATION_THRESHOLD
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              ±{stats.maxDeviation.toFixed(4)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Avg Deviation</p>
            <p className="text-lg font-bold text-gray-700">{stats.avgDeviation.toFixed(4)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Outliers</p>
            <div className="flex items-center justify-center gap-1">
              <p
                className={`text-lg font-bold ${
                  stats.outliers.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {stats.outliers.length}
              </p>
              <span className="text-xs text-gray-400">/ {stats.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Deviation Chart */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={deviationData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="key"
              tickFormatter={(key: string) => {
                const item = deviationData.find((d) => d.key === key);
                return item ? `${item.provider}` : key;
              }}
              stroke={chartColors.recharts.axis}
              fontSize={10}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              tickFormatter={(value: number) => `${value.toFixed(2)}%`}
              stroke={chartColors.recharts.axis}
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
            <ReferenceLine
              y={DEVIATION_THRESHOLD}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={-DEVIATION_THRESHOLD}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Bar dataKey="deviationPercent" radius={[2, 2, 0, 0]}>
              {deviationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getDeviationColor(entry.deviationPercent)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-gray-600">Normal (&lt;{DEVIATION_THRESHOLD}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-gray-600">
            Warning ({DEVIATION_THRESHOLD}% - {DANGER_THRESHOLD}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600">Danger (&gt;{DANGER_THRESHOLD}%)</span>
        </div>
      </div>

      {/* Outlier Alerts */}
      {stats && stats.outliers.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Price Deviation Warning</p>
              <p className="text-xs text-amber-700 mt-1">
                {stats.outliers.length} oracle(s) show significant price deviation from average:
              </p>
              <ul className="mt-2 space-y-1">
                {stats.outliers.map((outlier) => (
                  <li key={outlier.key} className="text-xs text-amber-700 flex items-center gap-2">
                    <span className="font-medium">{outlier.provider}</span>
                    <span className="text-amber-600">
                      ({outlier.deviationPercent > 0 ? '+' : ''}
                      {outlier.deviationPercent.toFixed(4)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* All Normal Message */}
      {stats && stats.outliers.length === 0 && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Prices are Consistent</p>
              <p className="text-xs text-emerald-700 mt-1">
                All oracle prices are within {DEVIATION_THRESHOLD}% deviation from the average
                price.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
