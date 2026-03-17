'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from '../common/DashboardCard';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';

type BaselineType = 'average' | 'median' | 'chainlink';

interface DeviationDataPoint {
  timestamp: number;
  time: string;
  deviations: Record<OracleProvider, number>;
  baseline: number;
}

interface DeviationStats {
  avgDeviation: number;
  maxDeviation: number;
  maxDeviationTime: number;
  maxDeviationProvider: OracleProvider;
  stdDeviation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface PriceDeviationHistoryChartProps {
  priceHistory: Partial<Record<OracleProvider, number[]>>;
  selectedOracles: OracleProvider[];
  oracleColors: Record<OracleProvider, string>;
  oracleNames: Record<OracleProvider, string>;
  chainlinkPrice?: number;
}

const DEVIATION_THRESHOLDS = {
  warning: 0.5,
  critical: 1.0,
};

function formatTime(index: number, t: (key: string) => string): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - (19 - index) * 3);
  return now.toLocaleTimeString(t('common.locale') || 'zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 5) return 'stable';
  const recent = data.slice(-5);
  const older = data.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 0.1) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

export function PriceDeviationHistoryChart({
  priceHistory,
  selectedOracles,
  oracleColors,
  oracleNames,
  chainlinkPrice,
}: PriceDeviationHistoryChartProps) {
  const t = useTranslations();
  const [baselineType, setBaselineType] = useState<BaselineType>('average');
  const [timeRange, setTimeRange] = useState<'all' | '10' | '5'>('all');

  const deviationHistory = useMemo(() => {
    const maxLength = Math.max(...Object.values(priceHistory).map((arr) => arr.length));
    if (maxLength === 0) return [];

    const data: DeviationDataPoint[] = [];

    for (let i = 0; i < maxLength; i++) {
      const prices: { provider: OracleProvider; price: number }[] = [];

      selectedOracles.forEach((provider) => {
        const history = priceHistory[provider] || [];
        if (history[i] !== undefined) {
          prices.push({ provider, price: history[i] });
        }
      });

      if (prices.length === 0) continue;

      let baseline: number;
      switch (baselineType) {
        case 'average': {
          const sum = prices.reduce((acc, p) => acc + p.price, 0);
          baseline = sum / prices.length;
          break;
        }
        case 'median': {
          const sorted = [...prices].sort((a, b) => a.price - b.price);
          const mid = Math.floor(sorted.length / 2);
          baseline =
            sorted.length % 2 !== 0
              ? sorted[mid].price
              : (sorted[mid - 1].price + sorted[mid].price) / 2;
          break;
        }
        case 'chainlink': {
          const chainlinkData = prices.find((p) => p.provider === OracleProvider.CHAINLINK);
          baseline = chainlinkData?.price || chainlinkPrice || prices[0].price;
          break;
        }
        default:
          baseline = prices.reduce((acc, p) => acc + p.price, 0) / prices.length;
      }

      const deviations: Record<OracleProvider, number> = {} as Record<OracleProvider, number>;
      prices.forEach(({ provider, price }) => {
        deviations[provider] = baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;
      });

      data.push({
        timestamp: Date.now() - (maxLength - 1 - i) * 30000,
        time: formatTime(i, t),
        deviations,
        baseline,
      });
    }

    return data;
  }, [priceHistory, selectedOracles, baselineType, chainlinkPrice]);

  const filteredData = useMemo(() => {
    if (timeRange === 'all') return deviationHistory;
    const count = timeRange === '10' ? 10 : 5;
    return deviationHistory.slice(-count);
  }, [deviationHistory, timeRange]);

  const deviationStats = useMemo((): Record<OracleProvider, DeviationStats> => {
    const stats: Record<OracleProvider, DeviationStats> = {} as Record<
      OracleProvider,
      DeviationStats
    >;

    selectedOracles.forEach((provider) => {
      const deviations = deviationHistory
        .map((d) => d.deviations[provider])
        .filter((v) => v !== undefined);

      if (deviations.length === 0) {
        stats[provider] = {
          avgDeviation: 0,
          maxDeviation: 0,
          maxDeviationTime: 0,
          maxDeviationProvider: provider,
          stdDeviation: 0,
          trend: 'stable',
        };
        return;
      }

      const absDeviations = deviations.map(Math.abs);
      const avgDeviation = absDeviations.reduce((a, b) => a + b, 0) / absDeviations.length;
      const maxAbsDeviation = Math.max(...absDeviations);
      const maxIndex = absDeviations.indexOf(maxAbsDeviation);
      const maxDeviationTime = deviationHistory[maxIndex]?.timestamp || 0;

      const variance =
        deviations.reduce((sum, d) => sum + Math.pow(d - avgDeviation, 2), 0) / deviations.length;
      const stdDeviation = Math.sqrt(variance);

      stats[provider] = {
        avgDeviation,
        maxDeviation: deviations[maxIndex] || 0,
        maxDeviationTime,
        maxDeviationProvider: provider,
        stdDeviation,
        trend: calculateTrend(absDeviations),
      };
    });

    return stats;
  }, [deviationHistory, selectedOracles]);

  const chartData = useMemo(() => {
    return filteredData.map((d) => {
      const point: Record<string, number | string> = {
        time: d.time,
        timestamp: d.timestamp,
      };
      selectedOracles.forEach((provider) => {
        point[provider] = d.deviations[provider];
      });
      return point;
    });
  }, [filteredData, selectedOracles]);

  const getBaselineLabel = (type: BaselineType): string => {
    switch (type) {
      case 'average':
        return t('charts.priceDeviationHistory.baselineAverage');
      case 'median':
        return t('charts.priceDeviationHistory.baselineMedian');
      case 'chainlink':
        return t('charts.priceDeviationHistory.baselineChainlink');
      default:
        return type;
    }
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const getTrendLabel = (trend: 'increasing' | 'decreasing' | 'stable'): string => {
    switch (trend) {
      case 'increasing':
        return t('charts.priceDeviationHistory.trendIncreasing');
      case 'decreasing':
        return t('charts.priceDeviationHistory.trendDecreasing');
      default:
        return t('charts.priceDeviationHistory.trendStable');
    }
  };

  const formatMaxDeviationTime = (timestamp: number): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString(t('common.locale') || 'zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <DashboardCard
        title={t('charts.priceDeviationHistory.title')}
        headerAction={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">
                {t('charts.priceDeviationHistory.baseline')}:
              </label>
              <select
                value={baselineType}
                onChange={(e) => setBaselineType(e.target.value as BaselineType)}
                className="px-3 py-1 border border-gray-300  text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="average">{t('charts.priceDeviationHistory.baselineAverage')}</option>
                <option value="median">{t('charts.priceDeviationHistory.baselineMedian')}</option>
                <option value="chainlink">
                  {t('charts.priceDeviationHistory.baselineChainlink')}
                </option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">
                {t('charts.priceDeviationHistory.timeRange')}:
              </label>
              <div className="flex gap-1">
                {(['all', '10', '5'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm  transition-colors ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range === 'all' ? t('charts.priceDeviationHistory.allData') : `${range}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={30}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const strName = typeof name === 'string' ? name : '';
                  const provider = strName as OracleProvider;
                  return [
                    `${numValue >= 0 ? '+' : ''}${numValue.toFixed(4)}%`,
                    oracleNames[provider] || strName,
                  ];
                }}
                labelFormatter={(label) => `${t('charts.priceDeviationHistory.time')}: ${label}`}
                contentStyle={{
                  backgroundColor: baseColors.gray[50],
                  border: `1px solid ${chartColors.recharts.grid}`,
                  boxShadow: shadowColors.tooltip,
                }}
              />
              <Legend
                formatter={(value: string) => oracleNames[value as OracleProvider] || value}
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
                label={{ value: 'Warning', fill: chartColors.recharts.warning, fontSize: 10 }}
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
                label={{ value: 'Critical', fill: chartColors.recharts.danger, fontSize: 10 }}
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
              />
              <ReferenceLine y={0} stroke={baseColors.gray[500]} strokeWidth={1} />
              {selectedOracles.map((provider) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  stroke={oracleColors[provider]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-orange-500 border-dashed"
              style={{ borderTop: `2px dashed ${chartColors.recharts.warning}` }}
            />
            <span className="text-xs text-gray-600">
              {t('charts.priceDeviationHistory.warningThreshold')} (±0.5%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-red-500 border-dashed"
              style={{ borderTop: `2px dashed ${chartColors.recharts.danger}` }}
            />
            <span className="text-xs text-gray-600">
              {t('charts.priceDeviationHistory.criticalThreshold')} (±1.0%)
            </span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title={t('charts.priceDeviationHistory.statsPanel')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedOracles.map((provider) => {
            const stats = deviationStats[provider];
            return (
              <div key={provider} className="bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3" style={{ backgroundColor: oracleColors[provider] }} />
                  <span className="font-medium text-gray-900">{oracleNames[provider]}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('charts.priceDeviationHistory.avgDeviation')}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        stats.avgDeviation >= DEVIATION_THRESHOLDS.critical
                          ? 'text-red-600'
                          : stats.avgDeviation >= DEVIATION_THRESHOLDS.warning
                            ? 'text-orange-600'
                            : 'text-gray-900'
                      }`}
                    >
                      {stats.avgDeviation.toFixed(4)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('charts.priceDeviationHistory.maxDeviation')}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        Math.abs(stats.maxDeviation) >= DEVIATION_THRESHOLDS.critical
                          ? 'text-red-600'
                          : Math.abs(stats.maxDeviation) >= DEVIATION_THRESHOLDS.warning
                            ? 'text-orange-600'
                            : 'text-gray-900'
                      }`}
                    >
                      {stats.maxDeviation >= 0 ? '+' : ''}
                      {stats.maxDeviation.toFixed(4)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('charts.priceDeviationHistory.maxDeviationTime')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatMaxDeviationTime(stats.maxDeviationTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('charts.priceDeviationHistory.stdDeviation')}
                    </span>
                    <span className="text-sm text-gray-900">{stats.stdDeviation.toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('charts.priceDeviationHistory.trend')}
                    </span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stats.trend)}
                      <span
                        className={`text-sm ${
                          stats.trend === 'increasing'
                            ? 'text-red-600'
                            : stats.trend === 'decreasing'
                              ? 'text-green-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {getTrendLabel(stats.trend)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard title={t('charts.priceDeviationHistory.deviationDistribution')}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={30}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const strName = typeof name === 'string' ? name : '';
                  const provider = strName as OracleProvider;
                  return [
                    `${numValue >= 0 ? '+' : ''}${numValue.toFixed(4)}%`,
                    oracleNames[provider] || strName,
                  ];
                }}
              />
              {selectedOracles.map((provider) => (
                <Area
                  key={provider}
                  type="monotone"
                  dataKey={provider as string}
                  stroke={oracleColors[provider]}
                  fill={oracleColors[provider]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('charts.priceDeviationHistory.overallStats')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('charts.priceDeviationHistory.baselineType')}
            </p>
            <p className="text-lg font-semibold text-blue-600">{getBaselineLabel(baselineType)}</p>
          </div>
          <div className="bg-green-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('charts.priceDeviationHistory.dataPoints')}
            </p>
            <p className="text-lg font-semibold text-green-600">{deviationHistory.length}</p>
          </div>
          <div className="bg-purple-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('charts.priceDeviationHistory.oracleCount')}
            </p>
            <p className="text-lg font-semibold text-purple-600">{selectedOracles.length}</p>
          </div>
          <div className="bg-orange-50 p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('charts.priceDeviationHistory.warningCount')}
            </p>
            <p className="text-lg font-semibold text-orange-600">
              {
                deviationHistory.filter((d) =>
                  Object.values(d.deviations).some(
                    (dev) => Math.abs(dev) >= DEVIATION_THRESHOLDS.warning
                  )
                ).length
              }
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
