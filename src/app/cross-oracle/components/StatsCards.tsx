'use client';

import { OracleProvider, PriceData } from '@/lib/types/oracle';
import { getTrendIcon, getHealthColor, HistoryMinMax } from '../constants';

interface StatsCardsProps {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  variance: number;
  lastStats: {
    avgPrice: number;
    maxPrice: number;
  } | null;
  historyMinMax: HistoryMinMax;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getConsistencyRating: (stdDevPercent: number) => string;
  t: (key: string) => string;
}

const ConsistencyBadge = ({ rating }: { rating: string }) => {
  const colors: Record<string, string> = {
    excellent: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    poor: '较差',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[rating] || colors.poor}`}
    >
      {labels[rating] || rating}
    </span>
  );
};

export function StatsCards({
  avgPrice,
  weightedAvgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviationPercent,
  variance,
  lastStats,
  historyMinMax,
  calculateChangePercent,
  getConsistencyRating,
  t,
}: StatsCardsProps) {
  const consistencyRating = getConsistencyRating(standardDeviationPercent);
  const healthColor = getHealthColor('deviation', standardDeviationPercent);

  return (
    <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('crossOracle.averagePrice')}
            </span>
          </div>
          {getTrendIcon(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
        </div>
        <p className="text-lg font-bold text-gray-900 mb-0.5">
          {avgPrice > 0
            ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Wtd:{' '}
            {weightedAvgPrice > 0
              ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </span>
        </div>
        {historyMinMax.avgPrice.max > -Infinity && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">历史范围</span>
            <span className="text-gray-600 font-medium">
              ${historyMinMax.avgPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
              - $
              {historyMinMax.avgPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('crossOracle.highestPrice')}
            </span>
          </div>
          {getTrendIcon(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
        </div>
        <p className="text-lg font-bold text-gray-900 mb-0.5">
          {maxPrice > 0
            ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Low:{' '}
            {minPrice > 0
              ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </span>
        </div>
        {historyMinMax.maxPrice.max > -Infinity && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">历史范围</span>
            <span className="text-gray-600 font-medium">
              ${historyMinMax.maxPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
              - $
              {historyMinMax.maxPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      <div
        className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${healthColor.bg}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${healthColor.bg.replace('bg-', 'bg-opacity-50 bg-')}`}
            >
              <svg
                className={`w-3.5 h-3.5 ${healthColor.text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
              价格范围
            </span>
          </div>
        </div>
        <p className={`text-lg font-bold mb-0.5 ${healthColor.text}`}>
          {priceRange > 0
            ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>占均价: {avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}%</span>
        </div>
        {historyMinMax.priceRange.max > -Infinity && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">历史范围</span>
            <span className="text-gray-600 font-medium">
              $
              {historyMinMax.priceRange.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
              - $
              {historyMinMax.priceRange.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      <div
        className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${healthColor.bg}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${healthColor.bg.replace('bg-', 'bg-opacity-50 bg-')}`}
            >
              <svg
                className={`w-3.5 h-3.5 ${healthColor.text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
              标准差
            </span>
          </div>
        </div>
        <p className={`text-lg font-bold mb-0.5 ${healthColor.text}`}>
          {standardDeviationPercent > 0 ? `±${standardDeviationPercent.toFixed(3)}%` : '-'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>σ: {variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}</span>
        </div>
        {historyMinMax.standardDeviationPercent.max > -Infinity && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">历史范围</span>
            <span className="text-gray-600 font-medium">
              {historyMinMax.standardDeviationPercent.min.toFixed(3)}% -{' '}
              {historyMinMax.standardDeviationPercent.max.toFixed(3)}%
            </span>
          </div>
        )}
      </div>

      <div
        className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${healthColor.bg}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${healthColor.bg.replace('bg-', 'bg-opacity-50 bg-')}`}
            >
              <svg
                className={`w-3.5 h-3.5 ${healthColor.text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
              方差
            </span>
          </div>
        </div>
        <p className={`text-lg font-bold mb-0.5 ${healthColor.text}`}>
          {variance > 0 ? `$${variance.toFixed(2)}` : '-'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>V[x]</span>
        </div>
        {historyMinMax.variance.max > -Infinity && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">历史范围</span>
            <span className="text-gray-600 font-medium">
              ${historyMinMax.variance.min.toFixed(2)} - ${historyMinMax.variance.max.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div
        className={`bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${healthColor.bg}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${healthColor.bg.replace('bg-', 'bg-opacity-50 bg-')}`}
            >
              <svg
                className={`w-3.5 h-3.5 ${healthColor.text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
              一致性
            </span>
          </div>
        </div>
        <div className="mt-1">
          <ConsistencyBadge rating={consistencyRating} />
        </div>
        <div className="mt-2 text-xs text-gray-400">基于标准差</div>
      </div>
    </div>
  );
}

interface MobileStatsCardsProps {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  variance: number;
  lastStats: {
    avgPrice: number;
    maxPrice: number;
  } | null;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getConsistencyRating: (stdDevPercent: number) => string;
  t: (key: string) => string;
}

export function MobileStatsCards({
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviationPercent,
  variance,
  lastStats,
  calculateChangePercent,
  getConsistencyRating,
  t,
}: MobileStatsCardsProps) {
  const consistencyRating = getConsistencyRating(standardDeviationPercent);
  const healthColor = getHealthColor('deviation', standardDeviationPercent);

  const stats = [
    {
      label: t('crossOracle.averagePrice'),
      value: avgPrice,
      change: calculateChangePercent(avgPrice, lastStats?.avgPrice || 0),
      subValue: `$${variance > 0 ? Math.sqrt(variance).toFixed(2) : '-'}`,
    },
    {
      label: t('crossOracle.highestPrice'),
      value: maxPrice,
      change: calculateChangePercent(maxPrice, lastStats?.maxPrice || 0),
      subValue: `Low: ${minPrice > 0 ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}`,
    },
    {
      label: '价格范围',
      value: priceRange,
      change: null,
      subValue: `${avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}% of avg`,
    },
    {
      label: '标准差',
      value: standardDeviationPercent,
      change: null,
      isPercent: true,
      subValue: `σ: ${variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}`,
    },
    { label: '方差', value: variance, change: null, isCurrency: true, subValue: 'V[x]' },
    { label: '一致性', value: consistencyRating, isBadge: true },
  ];

  return (
    <div className="md:hidden flex overflow-x-auto gap-3 pb-2 -mx-4 px-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex-shrink-0 w-36 bg-white rounded-lg border border-gray-200 p-3"
        >
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {stat.label}
          </div>
          {stat.isBadge ? (
            <ConsistencyBadge rating={stat.value as string} />
          ) : (
            <>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-lg font-bold text-gray-900">
                  {typeof stat.value === 'number' && stat.value > 0
                    ? stat.isPercent
                      ? `±${stat.value.toFixed(3)}%`
                      : stat.isCurrency
                        ? `$${stat.value.toFixed(2)}`
                        : `$${stat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '-'}
                </p>
                {stat.change !== null && getTrendIcon(stat.change ?? null)}
              </div>
              <div className="text-xs text-gray-400">{stat.subValue}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
