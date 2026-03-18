'use client';

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

const ConsistencyBadge = ({ rating, t }: { rating: string; t: (key: string) => string }) => {
  const colors: Record<string, string> = {
    excellent: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[rating] || colors.poor}`}
    >
      {t(`common.consistency.${rating}`) || rating}
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
    <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4 py-4 border-b border-gray-100">
      <div className="py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('crossOracle.averagePrice')}
          </span>
          {getTrendIcon(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
        </div>
        <p className="text-xl font-bold text-gray-900">
          {avgPrice > 0
            ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('crossOracle.weighted')}:{' '}
          {weightedAvgPrice > 0
            ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        {historyMinMax.avgPrice.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.avgPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $
            {historyMinMax.avgPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      <div className="py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t('crossOracle.highestPrice')}
          </span>
          {getTrendIcon(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
        </div>
        <p className="text-xl font-bold text-gray-900">
          {maxPrice > 0
            ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('crossOracle.low')}:{' '}
          {minPrice > 0
            ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        {historyMinMax.maxPrice.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.maxPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $
            {historyMinMax.maxPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      <div className={`py-2 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
            {t('crossOracle.priceRange')}
          </span>
        </div>
        <p className="text-xl font-bold">
          {priceRange > 0
            ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('crossOracle.ofAverage')}:{' '}
          {avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}%
        </p>
        {historyMinMax.priceRange.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.priceRange.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} -
            ${historyMinMax.priceRange.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      <div className={`py-2 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
            {t('crossOracle.standardDeviation')}
          </span>
        </div>
        <p className="text-xl font-bold">
          {standardDeviationPercent > 0 ? `±${standardDeviationPercent.toFixed(3)}%` : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          σ: {variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}
        </p>
        {historyMinMax.standardDeviationPercent.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: {historyMinMax.standardDeviationPercent.min.toFixed(3)}
            % - {historyMinMax.standardDeviationPercent.max.toFixed(3)}%
          </p>
        )}
      </div>

      <div className={`py-2 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
            {t('crossOracle.variance')}
          </span>
        </div>
        <p className="text-xl font-bold">{variance > 0 ? `$${variance.toFixed(2)}` : '-'}</p>
        <p className="text-xs text-gray-400 mt-0.5">V[x]</p>
        {historyMinMax.variance.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: ${historyMinMax.variance.min.toFixed(2)} - $
            {historyMinMax.variance.max.toFixed(2)}
          </p>
        )}
      </div>

      <div className={`py-2 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium uppercase tracking-wide ${healthColor.text}`}>
            {t('crossOracle.consistencyRating')}
          </span>
        </div>
        <div className="mt-1">
          <ConsistencyBadge rating={consistencyRating} t={t} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{t('crossOracle.basedOnStdDev')}</p>
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
      subValue: `${t('crossOracle.low')}: ${minPrice > 0 ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}`,
    },
    {
      label: t('crossOracle.priceRange'),
      value: priceRange,
      change: null,
      subValue: `${avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}% of avg`,
    },
    {
      label: t('crossOracle.standardDeviation'),
      value: standardDeviationPercent,
      change: null,
      isPercent: true,
      subValue: `σ: ${variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}`,
    },
    {
      label: t('crossOracle.variance'),
      value: variance,
      change: null,
      isCurrency: true,
      subValue: 'V[x]',
    },
    { label: t('crossOracle.consistencyRating'), value: consistencyRating, isBadge: true },
  ];

  return (
    <div className="md:hidden flex overflow-x-auto gap-4 pb-2 -mx-4 px-4">
      {stats.map((stat, index) => (
        <div key={index} className="flex-shrink-0 w-36 py-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {stat.label}
          </div>
          {stat.isBadge ? (
            <ConsistencyBadge rating={stat.value as string} t={t} />
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
