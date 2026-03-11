'use client';

import { useI18n } from '@/lib/i18n/context';
import { StatItem } from './StatItem';

interface StatsGridProps {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  dataPoints: number;
  queryDuration: number | null;
}

export function StatsGrid({
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  dataPoints,
  queryDuration,
}: StatsGridProps) {
  const { t } = useI18n();

  const getConsistencyRating = (stdDevPercent: number): { label: string; color: string } => {
    if (stdDevPercent < 0.1) return { label: '优秀', color: 'text-green-600' };
    if (stdDevPercent < 0.3) return { label: '良好', color: 'text-blue-600' };
    if (stdDevPercent < 0.5) return { label: '一般', color: 'text-orange-600' };
    return { label: '较差', color: 'text-red-600' };
  };

  const consistencyRating =
    standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-0 border-b border-gray-200 mb-8">
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem
          label={t('priceQuery.stats.avgPrice')}
          value={
            avgPrice > 0
              ? avgPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '-'
          }
          prefix="$"
        />
      </div>
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem
          label={t('priceQuery.stats.maxPrice')}
          value={
            maxPrice > 0
              ? maxPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '-'
          }
          prefix="$"
          subValue={
            minPrice > 0
              ? `${t('priceQuery.stats.minPrice')}: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : undefined
          }
        />
      </div>
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem
          label={t('priceQuery.stats.priceRange')}
          value={
            priceRange > 0
              ? priceRange.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '-'
          }
          prefix="$"
        />
      </div>
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem
          label={t('priceQuery.stats.standardDeviation')}
          value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
          suffix="%"
          subValue={
            standardDeviation > 0
              ? `${t('priceQuery.stats.absoluteValue')}: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : undefined
          }
        />
      </div>
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem label={t('priceQuery.stats.dataPoints')} value={dataPoints.toString()} />
      </div>
      <div className="px-4 border-r border-gray-200 last:border-r-0">
        <StatItem
          label={t('priceQuery.stats.queryDuration')}
          value={queryDuration !== null ? queryDuration.toString() : '-'}
          suffix=" ms"
        />
      </div>
      <div className="px-4">
        <div className="py-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {t('priceQuery.stats.consistencyRating')}
          </div>
          <div
            className={`text-2xl font-bold ${
              standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
            }`}
          >
            {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
