'use client';

import { useState, useMemo } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors, baseColors } from '@/lib/config/colors';
import { getOracleColor } from '@/lib/oracles/colors';
import { type OracleProvider } from '@/types/oracle';

import { DifferenceBadge } from './DifferenceBadge';
import { type OracleComparisonItem, type OracleComparisonResult } from './types';

interface OracleComparisonViewProps {
  oracles: OracleComparisonItem[];
  benchmarkOracle?: OracleProvider;
  showCharts?: boolean;
  showRadar?: boolean;
  showTable?: boolean;
  className?: string;
}

export function OracleComparisonView({
  oracles,
  benchmarkOracle,
  showCharts = true,
  showRadar = true,
  showTable = true,
  className = '',
}: OracleComparisonViewProps) {
  const t = useTranslations('comparison.oracleComparison');

  const [sortBy, setSortBy] = useState<'price' | 'deviation' | 'confidence' | 'responseTime'>(
    'price'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const comparisonResult: OracleComparisonResult = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics?.price != null);
    const prices = validOracles.map((o) => o.metrics.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const maxDeviation = Math.max(...validOracles.map((o) => Math.abs(o.metrics.deviation || 0)));
    const cv = (stdDev / avg) * 100;
    const consistencyScore = Math.max(0, Math.min(100, 100 - cv * 10));

    return {
      oracles: validOracles,
      averagePrice: avg,
      medianPrice: median,
      priceRange: max - min,
      stdDeviation: stdDev,
      consistencyScore,
      maxDeviation,
    };
  }, [oracles]);

  const sortedOracles = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics != null);
    const sorted = [...validOracles].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'price':
          aVal = a.metrics?.price ?? 0;
          bVal = b.metrics?.price ?? 0;
          break;
        case 'deviation':
          aVal = Math.abs(a.metrics?.deviation || 0);
          bVal = Math.abs(b.metrics?.deviation || 0);
          break;
        case 'confidence':
          aVal = a.metrics?.confidence || 0;
          bVal = b.metrics?.confidence || 0;
          break;
        case 'responseTime':
          aVal = a.metrics?.responseTime || 0;
          bVal = b.metrics?.responseTime || 0;
          break;
        default:
          aVal = a.metrics?.price ?? 0;
          bVal = b.metrics?.price ?? 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [oracles, sortBy, sortOrder]);

  const radarData = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics != null);
    if (validOracles.length === 0) return [];
    const metrics = [
      {
        key: 'price',
        label: t('metrics.price'),
        max: Math.max(...validOracles.map((o) => o.metrics?.price ?? 0)) * 1.1 || 1,
      },
      { key: 'confidence', label: t('metrics.confidence'), max: 100 },
      {
        key: 'responseTime',
        label: t('metrics.responseTime'),
        max: Math.max(...validOracles.map((o) => o.metrics?.responseTime || 0)) * 1.2 || 1,
      },
      { key: 'accuracy', label: t('metrics.accuracy'), max: 100 },
      { key: 'reliability', label: t('metrics.reliability'), max: 100 },
    ];

    return metrics.map((m) => ({
      metric: m.label,
      ...validOracles.reduce(
        (acc, o) => {
          const val = (o.metrics?.[m.key as keyof typeof o.metrics] as number) || 0;
          acc[o.name] = (val / m.max) * 100;
          return acc;
        },
        {} as Record<string, number>
      ),
    }));
  }, [oracles, t]);

  const priceChartData = useMemo(() => {
    return oracles
      .filter((o) => o.metrics != null)
      .map((o) => ({
        name: o.name,
        price: o.metrics?.price ?? 0,
        deviation: o.metrics?.deviation || 0,
        color: o.color,
      }));
  }, [oracles]);

  const getConsistencyColor = (score: number): string => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-primary-600';
    if (score >= 50) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getConsistencyLabel = (score: number): string => {
    if (score >= 90) return t('consistency.excellent');
    if (score >= 70) return t('consistency.good');
    if (score >= 50) return t('consistency.fair');
    return t('consistency.poor');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('averagePrice')}</p>
          <p className="text-lg font-semibold text-gray-900">
            ${comparisonResult.averagePrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('medianPrice')}</p>
          <p className="text-lg font-semibold text-gray-900">
            ${comparisonResult.medianPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('consistencyScore')}</p>
          <p
            className={`text-lg font-semibold ${getConsistencyColor(comparisonResult.consistencyScore)}`}
          >
            {comparisonResult.consistencyScore.toFixed(1)}
          </p>
          <p className="text-xs text-gray-400">
            {getConsistencyLabel(comparisonResult.consistencyScore)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('maxDeviation')}</p>
          <p className="text-lg font-semibold text-gray-900">
            {comparisonResult.maxDeviation.toFixed(3)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Comparison Bar Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('priceComparison')}</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, t('price')]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                    {priceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deviation Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              {t('deviationFromAverage')}
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={baseColors.gray[200]}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value) => [
                      `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(3)}%`,
                      t('deviation'),
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
                    {priceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.deviation >= 0
                            ? chartColors.semantic.positive
                            : chartColors.semantic.negative
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Radar Chart */}
      {showRadar && oracles.length >= 2 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('performanceRadar')}</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 80, left: 80, bottom: 20 }}>
                <PolarGrid stroke={baseColors.gray[200]} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                {oracles.map((oracle) => (
                  <Radar
                    key={oracle.provider}
                    name={oracle.name}
                    dataKey={oracle.name}
                    stroke={oracle.color}
                    fill={oracle.color}
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {showTable && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{t('detailedComparison')}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs border border-gray-300 px-2 py-1 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="price">{t('metrics.price')}</option>
                <option value="deviation">{t('metrics.deviation')}</option>
                <option value="confidence">{t('metrics.confidence')}</option>
                <option value="responseTime">{t('metrics.responseTime')}</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('oracle')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('price')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('deviationFromAverage')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confidence')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('responseTime')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accuracy')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOracles.map((oracle) => {
                  const deviation = oracle.metrics?.deviation || 0;
                  const isBenchmark = benchmarkOracle === oracle.provider;

                  return (
                    <tr
                      key={oracle.provider}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${isBenchmark ? 'bg-primary-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: oracle.color }}
                          />
                          <span className="font-medium text-gray-900">{oracle.name}</span>
                          {isBenchmark && (
                            <span className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-md">
                              {t('benchmark')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        ${oracle.metrics?.price?.toFixed(2) ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DifferenceBadge value={deviation} type="percentage" />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {oracle.metrics?.confidence !== undefined
                          ? `${(oracle.metrics.confidence * 100).toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {oracle.metrics?.responseTime !== undefined
                          ? `${oracle.metrics.responseTime}ms`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {oracle.metrics?.accuracy !== undefined
                          ? `${oracle.metrics.accuracy.toFixed(1)}%`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OracleComparisonView;
