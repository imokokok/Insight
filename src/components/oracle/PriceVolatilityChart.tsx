'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { OracleProvider } from '@/lib/types/oracle';
import { DashboardCard } from './DashboardCard';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: PriceDataPoint[];
}

export interface VolatilityResult {
  oracle: OracleProvider;
  name: string;
  stdDev: number;
  mean: number;
  cv: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
}

export interface VolatilityTrendPoint {
  period: string;
  [key: string]: string | number;
}

export interface PriceVolatilityChartProps {
  data: OraclePriceHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  showTrend?: boolean;
  className?: string;
}

const DEFAULT_ORACLE_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#375BD2',
  [OracleProvider.BAND_PROTOCOL]: '#9B51E0',
  [OracleProvider.UMA]: '#FF6B6B',
  [OracleProvider.PYTH_NETWORK]: '#EC4899',
  [OracleProvider.API3]: '#10B981',
};

function calculateStandardDeviation(prices: number[]): number {
  if (prices.length === 0) return 0;
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const squaredDiffs = prices.map((price) => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
  return Math.sqrt(variance);
}

function calculateCoefficientOfVariation(stdDev: number, mean: number): number {
  if (mean === 0) return 0;
  return (stdDev / mean) * 100;
}

function calculateVolatility(
  data: OraclePriceHistory[],
  oracleNames: Record<OracleProvider, string>
): VolatilityResult[] {
  return data.map((oracleData) => {
    const prices = oracleData.prices.map((p) => p.price);
    const mean = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const stdDev = calculateStandardDeviation(prices);
    const cv = calculateCoefficientOfVariation(stdDev, mean);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const priceRange = maxPrice - minPrice;

    return {
      oracle: oracleData.oracle,
      name: oracleNames[oracleData.oracle] || oracleData.oracle,
      stdDev,
      mean,
      cv,
      minPrice,
      maxPrice,
      priceRange,
    };
  });
}

function calculateRollingVolatility(
  data: OraclePriceHistory[],
  windowSize: number = 5
): VolatilityTrendPoint[] {
  if (data.length === 0) return [];

  const allTimestamps = new Set<number>();
  data.forEach((oracleData) => {
    oracleData.prices.forEach((p) => allTimestamps.add(p.timestamp));
  });

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  return sortedTimestamps.map((timestamp, index) => {
    const point: VolatilityTrendPoint = {
      period: new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    data.forEach((oracleData) => {
      const windowPrices: number[] = [];
      for (let i = Math.max(0, index - windowSize + 1); i <= index; i++) {
        const pricePoint = oracleData.prices.find(
          (p) => p.timestamp === sortedTimestamps[i]
        );
        if (pricePoint) {
          windowPrices.push(pricePoint.price);
        }
      }

      if (windowPrices.length >= 2) {
        const stdDev = calculateStandardDeviation(windowPrices);
        const mean = windowPrices.reduce((sum, p) => sum + p, 0) / windowPrices.length;
        const cv = calculateCoefficientOfVariation(stdDev, mean);
        point[oracleData.oracle] = Number(cv.toFixed(4));
      } else {
        point[oracleData.oracle] = 0;
      }
    });

    return point;
  });
}

function getVolatilityLevel(cv: number): { label: string; color: string } {
  if (cv < 0.5) return { label: '极低', color: '#10B981' };
  if (cv < 1.0) return { label: '低', color: '#3B82F6' };
  if (cv < 2.0) return { label: '中等', color: '#F59E0B' };
  if (cv < 5.0) return { label: '高', color: '#EF4444' };
  return { label: '极高', color: '#991B1B' };
}

export function PriceVolatilityChart({
  data,
  oracleNames: customOracleNames,
  showTrend = true,
  className,
}: PriceVolatilityChartProps) {
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };

  const volatilityResults = useMemo(
    () => calculateVolatility(data, oracleNames),
    [data, oracleNames]
  );

  const trendData = useMemo(
    () => (showTrend ? calculateRollingVolatility(data) : []),
    [data, showTrend]
  );

  const chartData = useMemo(
    () =>
      volatilityResults.map((result) => ({
        name: result.name,
        cv: Number(result.cv.toFixed(4)),
        stdDev: result.stdDev,
        mean: result.mean,
        oracle: result.oracle,
        level: getVolatilityLevel(result.cv),
      })),
    [volatilityResults]
  );

  const avgCV = useMemo(() => {
    if (volatilityResults.length === 0) return 0;
    return volatilityResults.reduce((sum, r) => sum + r.cv, 0) / volatilityResults.length;
  }, [volatilityResults]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const result = volatilityResults.find((r) => r.oracle === dataPoint.oracle);

    if (!result) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
        <p className="text-sm font-semibold text-gray-900 mb-3">{dataPoint.name}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">变异系数 (CV)</span>
            <span className="text-sm font-bold" style={{ color: dataPoint.level.color }}>
              {result.cv.toFixed(4)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">标准差 (σ)</span>
            <span className="text-sm font-medium text-gray-700">
              ${result.stdDev.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">平均价格</span>
            <span className="text-sm font-medium text-gray-700">
              ${result.mean.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">价格范围</span>
            <span className="text-sm font-medium text-gray-700">
              ${result.minPrice.toFixed(2)} - ${result.maxPrice.toFixed(2)}
            </span>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">波动率等级</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${dataPoint.level.color}20`,
                  color: dataPoint.level.color,
                }}
              >
                {dataPoint.level.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="text-xs text-gray-600">{entry.name}</span>
              <span className="text-xs font-medium" style={{ color: entry.color }}>
                {Number(entry.value).toFixed(4)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardCard title="价格波动率对比分析" className={className}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">平均变异系数</p>
            <p className="text-2xl font-bold text-blue-600">{avgCV.toFixed(4)}%</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">最低波动</p>
            <p className="text-2xl font-bold text-green-600">
              {Math.min(...volatilityResults.map((r) => r.cv)).toFixed(4)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">最高波动</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.max(...volatilityResults.map((r) => r.cv)).toFixed(4)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">预言机数量</p>
            <p className="text-2xl font-bold text-purple-600">{volatilityResults.length}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">波动率对比（变异系数 CV）</h4>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12, fill: '#374151' }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cv" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.level.color} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {showTrend && trendData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">滚动波动率趋势</h4>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}%`}
                    width={50}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend />
                  {data.map((oracleData) => (
                    <Line
                      key={oracleData.oracle}
                      type="monotone"
                      dataKey={oracleData.oracle}
                      name={oracleNames[oracleData.oracle]}
                      stroke={ORACLE_COLORS[oracleData.oracle]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  预言机
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  变异系数 (CV)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标准差 (σ)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均价格
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  价格范围
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  波动等级
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {volatilityResults.map((result) => {
                const level = getVolatilityLevel(result.cv);
                return (
                  <tr key={result.oracle} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: ORACLE_COLORS[result.oracle] }}
                        />
                        <span className="text-sm font-medium text-gray-900">{result.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold" style={{ color: level.color }}>
                        {result.cv.toFixed(4)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${result.stdDev.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${result.mean.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${result.minPrice.toFixed(2)} - ${result.maxPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${level.color}20`,
                          color: level.color,
                        }}
                      >
                        {level.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">波动率计算说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>标准差 (σ)</strong>: 衡量价格偏离平均值的程度，σ = √[Σ(xi-x̄)² / n]
            </li>
            <li>
              • <strong>变异系数 (CV)</strong>: 标准差与平均值的比率，CV = (σ / x̄) × 100%
            </li>
            <li>• CV 越低表示价格越稳定，越高表示波动越大</li>
            <li>• 滚动波动率使用 5 个时间点的窗口计算，反映波动率随时间的变化趋势</li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
