'use client';

import { SparklineChart } from '@/components/ui';

import { getTrendIcon, getHealthColor, type HistoryMinMax } from '../constants';

interface SparklineData {
  avgPrice?: number[];
  maxPrice?: number[];
  minPrice?: number[];
  priceRange?: number[];
  standardDeviation?: number[];
  variance?: number[];
}

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
  sparklineData?: SparklineData;
}

const ConsistencyBadge = ({ rating, t }: { rating: string; t: (key: string) => string }) => {
  const colors: Record<string, string> = {
    excellent: 'bg-emerald-100 text-emerald-700',
    good: 'bg-primary-100 text-primary-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-danger-100 text-danger-700',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[rating] || colors.poor}`}
    >
      {t(`consistency.${rating}`) || rating}
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
  sparklineData,
}: StatsCardsProps) {
  const consistencyRating = getConsistencyRating(standardDeviationPercent);
  const healthColor = getHealthColor('deviation', standardDeviationPercent);

  return (
    <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4 py-4 border-b border-gray-100">
      {/* 平均价格 */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-500">{t('crossOracle.averagePrice')}</span>
          {getTrendIcon(calculateChangePercent(avgPrice, lastStats?.avgPrice || 0))}
        </div>
        <p className="text-lg font-bold text-gray-900">
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
        {sparklineData?.avgPrice && sparklineData.avgPrice.length > 0 && (
          <div className="mt-2">
            <SparklineChart data={sparklineData.avgPrice} width={100} height={30} fill animate />
          </div>
        )}
        {historyMinMax.avgPrice.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.avgPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $
            {historyMinMax.avgPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* 最高价格 */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-500">{t('crossOracle.highestPrice')}</span>
          {getTrendIcon(calculateChangePercent(maxPrice, lastStats?.maxPrice || 0))}
        </div>
        <p className="text-lg font-bold text-gray-900">
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
        {sparklineData?.maxPrice && sparklineData.maxPrice.length > 0 && (
          <div className="mt-2">
            <SparklineChart data={sparklineData.maxPrice} width={100} height={30} fill animate />
          </div>
        )}
        {historyMinMax.maxPrice.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.maxPrice.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $
            {historyMinMax.maxPrice.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* 价格范围 */}
      <div className={`bg-white rounded-lg border border-gray-100 p-4 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${healthColor.text}`}>
            {t('crossOracle.priceRange')}
          </span>
        </div>
        <p className="text-lg font-bold">
          {priceRange > 0
            ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('crossOracle.ofAverage')}:{' '}
          {avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}%
        </p>
        {sparklineData?.priceRange && sparklineData.priceRange.length > 0 && (
          <div className="mt-2">
            <SparklineChart data={sparklineData.priceRange} width={100} height={30} fill animate />
          </div>
        )}
        {historyMinMax.priceRange.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: $
            {historyMinMax.priceRange.min.toLocaleString(undefined, { maximumFractionDigits: 0 })} -
            ${historyMinMax.priceRange.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* 标准差 */}
      <div className={`bg-white rounded-lg border border-gray-100 p-4 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${healthColor.text}`}>
            {t('crossOracle.standardDeviation')}
          </span>
        </div>
        <p className="text-lg font-bold">
          {standardDeviationPercent > 0 ? `±${standardDeviationPercent.toFixed(3)}%` : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          σ: {variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}
        </p>
        {sparklineData?.standardDeviation && sparklineData.standardDeviation.length > 0 && (
          <div className="mt-2">
            <SparklineChart
              data={sparklineData.standardDeviation}
              width={100}
              height={30}
              fill
              animate
            />
          </div>
        )}
        {historyMinMax.standardDeviationPercent.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: {historyMinMax.standardDeviationPercent.min.toFixed(3)}
            % - {historyMinMax.standardDeviationPercent.max.toFixed(3)}%
          </p>
        )}
      </div>

      {/* 方差 */}
      <div className={`bg-white rounded-lg border border-gray-100 p-4 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${healthColor.text}`}>
            {t('crossOracle.variance')}
          </span>
        </div>
        <p className="text-lg font-bold">{variance > 0 ? `$${variance.toFixed(2)}` : '-'}</p>
        <p className="text-xs text-gray-400 mt-0.5">V[x]</p>
        {sparklineData?.variance && sparklineData.variance.length > 0 && (
          <div className="mt-2">
            <SparklineChart data={sparklineData.variance} width={100} height={30} fill animate />
          </div>
        )}
        {historyMinMax.variance.max > -Infinity && (
          <p className="text-xs text-gray-400 mt-1">
            {t('crossOracle.historyRange')}: ${historyMinMax.variance.min.toFixed(2)} - $
            {historyMinMax.variance.max.toFixed(2)}
          </p>
        )}
      </div>

      {/* 一致性评级 */}
      <div className={`bg-white rounded-lg border border-gray-100 p-4 ${healthColor.text}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${healthColor.text}`}>
            {t('crossOracle.consistencyRating')}
          </span>
        </div>
        <div className="mt-1">
          <ConsistencyBadge rating={consistencyRating} t={t} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{t('crossOracle.basedOnStdDev')}</p>
        {sparklineData?.avgPrice && sparklineData.avgPrice.length > 0 && (
          <div className="mt-2">
            <SparklineChart data={sparklineData.avgPrice} width={100} height={30} fill animate />
          </div>
        )}
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
  sparklineData?: SparklineData;
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
  sparklineData,
}: MobileStatsCardsProps) {
  const consistencyRating = getConsistencyRating(standardDeviationPercent);

  const stats = [
    {
      label: t('crossOracle.averagePrice'),
      value: avgPrice,
      change: calculateChangePercent(avgPrice, lastStats?.avgPrice || 0),
      subValue: `$${variance > 0 ? Math.sqrt(variance).toFixed(2) : '-'}`,
      sparkline: sparklineData?.avgPrice,
    },
    {
      label: t('crossOracle.highestPrice'),
      value: maxPrice,
      change: calculateChangePercent(maxPrice, lastStats?.maxPrice || 0),
      subValue: `${t('crossOracle.low')}: ${minPrice > 0 ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}`,
      sparkline: sparklineData?.maxPrice,
    },
    {
      label: t('crossOracle.priceRange'),
      value: priceRange,
      change: null,
      subValue: `${avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}% of avg`,
      sparkline: sparklineData?.priceRange,
    },
    {
      label: t('crossOracle.standardDeviation'),
      value: standardDeviationPercent,
      change: null,
      isPercent: true,
      subValue: `σ: ${variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}`,
      sparkline: sparklineData?.standardDeviation,
    },
    {
      label: t('crossOracle.variance'),
      value: variance,
      change: null,
      isCurrency: true,
      subValue: 'V[x]',
      sparkline: sparklineData?.variance,
    },
    {
      label: t('crossOracle.consistencyRating'),
      value: consistencyRating,
      isBadge: true,
      sparkline: sparklineData?.avgPrice,
    },
  ];

  return (
    <div className="md:hidden flex overflow-x-auto gap-4 pb-4 -mx-4 px-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex-shrink-0 w-40 bg-white rounded-lg border border-gray-100 p-4"
        >
          <div className="text-sm font-medium text-gray-500 mb-1">{stat.label}</div>
          {stat.isBadge ? (
            <ConsistencyBadge rating={stat.value as string} t={t} />
          ) : (
            <>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-base font-bold text-gray-900">
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
          {stat.sparkline && stat.sparkline.length > 0 && (
            <div className="mt-2">
              <SparklineChart data={stat.sparkline} width={120} height={32} fill animate />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
